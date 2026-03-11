import { KeyRound } from 'lucide-react'
import type { ConnectorDefinition } from '../types'

export const oauth: ConnectorDefinition = {
  type: 'oauth',
  label: 'OAuth',
  icon: KeyRound,
  color: 'bg-indigo-500',
  category: 'Integration',
  defaultDirection: 'input',
  fields: [
    { key: 'client_id', label: 'Client ID', type: 'string', required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'redirect_uri', label: 'Redirect URI', type: 'string', placeholder: 'http://localhost:3000/callback', required: true },
    { key: 'scopes', label: 'Scopes', type: 'string', placeholder: 'openid,email,profile', helpText: 'Comma-separated scopes' },
  ],
  drivers: [
    { value: 'google', label: 'Google', fields: [] },
    { value: 'github', label: 'GitHub', fields: [] },
    { value: 'apple', label: 'Apple', fields: [] },
    {
      value: 'oidc',
      label: 'OIDC',
      fields: [
        { key: 'issuer', label: 'Issuer URL', type: 'string', placeholder: 'https://auth.example.com', required: true },
      ],
    },
    {
      value: 'custom',
      label: 'Custom',
      fields: [
        { key: 'auth_url', label: 'Auth URL', type: 'string', required: true },
        { key: 'token_url', label: 'Token URL', type: 'string', required: true },
        { key: 'userinfo_url', label: 'Userinfo URL', type: 'string' },
      ],
    },
  ],
}
