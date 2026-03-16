package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"sync/atomic"

	"github.com/gorilla/websocket"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// DebugClient manages a WebSocket connection to a Mycel runtime debug server.
type DebugClient struct {
	mu        sync.Mutex
	conn      *websocket.Conn
	app       *App
	nextID    atomic.Uint64
	pending   map[uint64]chan json.RawMessage // request ID → response channel
	pendingMu sync.Mutex
	done      chan struct{}
}

// JSON-RPC types
type jsonRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      uint64      `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type jsonRPCResponse struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      *uint64          `json:"id,omitempty"`
	Result  json.RawMessage  `json:"result,omitempty"`
	Error   *json.RawMessage `json:"error,omitempty"`
	Method  string           `json:"method,omitempty"`
	Params  json.RawMessage  `json:"params,omitempty"`
}

func NewDebugClient(app *App) *DebugClient {
	return &DebugClient{
		app:     app,
		pending: make(map[uint64]chan json.RawMessage),
	}
}

// Connect opens a WebSocket to the Mycel debug endpoint.
func (d *DebugClient) Connect(url string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.conn != nil {
		return fmt.Errorf("already connected")
	}

	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	d.conn = conn
	d.done = make(chan struct{})

	// Read loop: dispatch responses and events
	go d.readLoop()

	return nil
}

// Disconnect closes the WebSocket connection.
func (d *DebugClient) Disconnect() {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.conn != nil {
		d.conn.Close()
		d.conn = nil
	}
	if d.done != nil {
		close(d.done)
		d.done = nil
	}

	// Clear pending requests
	d.pendingMu.Lock()
	for id, ch := range d.pending {
		close(ch)
		delete(d.pending, id)
	}
	d.pendingMu.Unlock()
}

// Send sends a JSON-RPC request and waits for the response.
func (d *DebugClient) Send(method string, params interface{}) (string, error) {
	d.mu.Lock()
	conn := d.conn
	d.mu.Unlock()

	if conn == nil {
		return "", fmt.Errorf("not connected")
	}

	id := d.nextID.Add(1)

	// Create response channel
	ch := make(chan json.RawMessage, 1)
	d.pendingMu.Lock()
	d.pending[id] = ch
	d.pendingMu.Unlock()

	defer func() {
		d.pendingMu.Lock()
		delete(d.pending, id)
		d.pendingMu.Unlock()
	}()

	req := jsonRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	d.mu.Lock()
	err = conn.WriteMessage(websocket.TextMessage, data)
	d.mu.Unlock()
	if err != nil {
		return "", err
	}

	// Wait for response
	result, ok := <-ch
	if !ok {
		return "", fmt.Errorf("connection closed")
	}

	return string(result), nil
}

func (d *DebugClient) readLoop() {
	defer func() {
		d.mu.Lock()
		d.conn = nil
		d.mu.Unlock()

		// Notify frontend that connection was lost
		if d.app != nil && d.app.ctx != nil {
			wailsRuntime.EventsEmit(d.app.ctx, "debug:disconnected")
		}
	}()

	for {
		d.mu.Lock()
		conn := d.conn
		d.mu.Unlock()
		if conn == nil {
			return
		}

		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("debug ws error: %v", err)
			}
			return
		}

		var resp jsonRPCResponse
		if err := json.Unmarshal(message, &resp); err != nil {
			continue
		}

		if resp.ID != nil {
			// Response to a request
			d.pendingMu.Lock()
			ch, ok := d.pending[*resp.ID]
			d.pendingMu.Unlock()
			if ok {
				if resp.Error != nil {
					ch <- *resp.Error
				} else {
					ch <- resp.Result
				}
			}
		} else if resp.Method != "" {
			// Event notification — forward to frontend
			if d.app != nil && d.app.ctx != nil {
				eventData := map[string]interface{}{
					"method": resp.Method,
					"params": json.RawMessage(resp.Params),
				}
				data, _ := json.Marshal(eventData)
				wailsRuntime.EventsEmit(d.app.ctx, "debug:event", string(data))
			}
		}
	}
}

// IsConnected returns whether the debug client is connected.
func (d *DebugClient) IsConnected() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.conn != nil
}

// --- Wails bindings (on App) ---

// DebugConnect connects to a Mycel runtime debug server.
func (a *App) DebugConnect(url string) error {
	if a.debugClient == nil {
		a.debugClient = NewDebugClient(a)
	}
	return a.debugClient.Connect(url)
}

// DebugDisconnect disconnects from the debug server.
func (a *App) DebugDisconnect() {
	if a.debugClient != nil {
		a.debugClient.Disconnect()
	}
}

// DebugIsConnected checks connection status.
func (a *App) DebugIsConnected() bool {
	return a.debugClient != nil && a.debugClient.IsConnected()
}

// DebugSend sends a JSON-RPC method call and returns the result.
func (a *App) DebugSend(method string, paramsJSON string) (string, error) {
	if a.debugClient == nil || !a.debugClient.IsConnected() {
		return "", fmt.Errorf("not connected to debug server")
	}

	var params interface{}
	if paramsJSON != "" {
		if err := json.Unmarshal([]byte(paramsJSON), &params); err != nil {
			return "", fmt.Errorf("invalid params: %w", err)
		}
	}

	return a.debugClient.Send(method, params)
}
