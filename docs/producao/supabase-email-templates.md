# Templates de email do Supabase Auth

Customizar em **Supabase Dashboard → Authentication → Email Templates**.

Os templates default funcionam mas mostram URLs feias e textos em inglês.
Os templates abaixo deixam o produto com a cara da Parrilla.

> **Variáveis disponíveis** (Supabase substitui automaticamente):
> - `{{ .ConfirmationURL }}` — link mágico/reset (já vem com token + redirectTo)
> - `{{ .Token }}` — token bruto (não usar)
> - `{{ .Email }}` — email do destinatário
> - `{{ .SiteURL }}` — URL configurada em Project Settings

---

## 1. Magic Link (login do cliente)

**Subject:**
```
Seu link mágico — Parrilla 8187
```

**Body (HTML):**
```html
<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 40px auto; padding: 32px 24px; background: #ffffff; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; padding: 12px 18px; border: 2px solid #F5C042; border-radius: 999px; color: #C45C26; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
      Parrilla 8187 · Bar e Churrascaria
    </div>
  </div>

  <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.01em;">
    Aqui está seu link de acesso
  </h1>

  <p style="font-size: 15px; line-height: 1.6; color: #404040; margin: 0 0 24px;">
    Clique no botão abaixo para entrar na sua conta. O link é válido por <strong>1 hora</strong> e funciona uma única vez.
  </p>

  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; background: #1a1a1a; color: #F5C042; font-weight: 700; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 4px;">
    Entrar na minha conta
  </a>

  <p style="font-size: 12px; line-height: 1.6; color: #888; margin: 32px 0 0;">
    Se você não solicitou esse link, pode ignorar esse email com segurança. Ninguém vai conseguir entrar na sua conta.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />

  <p style="font-size: 11px; color: #aaa; line-height: 1.6; margin: 0;">
    Parrilla 8187 — Boa Viagem, Recife/PE<br>
    Esse email foi enviado para {{ .Email }} porque você está usando o sistema de reservas em reservas.parilla8187.antrop-ia.com.
  </p>
</div>
```

---

## 2. Reset Password (esqueci a senha do admin)

**Subject:**
```
Redefinir sua senha — Parrilla 8187 (admin)
```

**Body (HTML):**
```html
<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 40px auto; padding: 32px 24px; background: #ffffff; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; padding: 12px 18px; border: 2px solid #F5C042; border-radius: 999px; color: #C45C26; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
      Parrilla 8187 · Painel Admin
    </div>
  </div>

  <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.01em;">
    Redefinir sua senha
  </h1>

  <p style="font-size: 15px; line-height: 1.6; color: #404040; margin: 0 0 24px;">
    Recebemos um pedido para redefinir a senha da sua conta administrativa. Clique abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
  </p>

  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; background: #1a1a1a; color: #F5C042; font-weight: 700; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 4px;">
    Criar nova senha
  </a>

  <p style="font-size: 12px; line-height: 1.6; color: #888; margin: 32px 0 0;">
    <strong>Não foi você?</strong> Ignore esse email. Sua senha atual continua válida e ninguém vai conseguir entrar na sua conta sem clicar nesse link.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />

  <p style="font-size: 11px; color: #aaa; line-height: 1.6; margin: 0;">
    Parrilla 8187 — Boa Viagem, Recife/PE<br>
    Painel administrativo · {{ .Email }}
  </p>
</div>
```

---

## 3. Confirm Signup

**Não usar.** Sprint 8 usa `signInWithOtp({ shouldCreateUser: true })` que cria conta sem precisar de email de confirmação separado. O magic link já cria + autentica em uma etapa.

---

## Onde aplicar

1. https://supabase.com/dashboard/project/_/auth/templates
2. Aba **Magic Link** → cole subject + body do item 1, clique **Save**
3. Aba **Reset Password** → cole subject + body do item 2, **Save**

## Validar

1. Acessa `/admin/login` em produção
2. Clica em "Esqueci minha senha"
3. Digita um email admin (ex `dev@antrop-ia.com`)
4. Confere o email recebido — deve estar com cara da Parrilla, botão amarelo, copy em PT-BR
