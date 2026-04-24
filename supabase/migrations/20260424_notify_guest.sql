-- Sprint 9 add-on — Confirmação WhatsApp ao cliente
-- Adiciona toggle separado e template para enviar confirmação ao número
-- do hóspede após reserva criada. Independente do `enabled` (que controla
-- staff): admin pode ligar/desligar cada um.
-- Idempotente.

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS notify_guest boolean NOT NULL DEFAULT false;

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS template_guest_confirmation text NOT NULL DEFAULT
    E'Olá {nome}! 🎉\n\nSua reserva na Parrilla 8187 foi confirmada:\n\n📅 {data} às {hora}\n👥 {pessoas} pessoas\n📍 {espaco}\n\nCódigo: {codigo}\n\nQualquer ajuste, é só chamar.';

COMMENT ON COLUMN public.notification_settings.notify_guest IS
  'Toggle independente do enabled: liga/desliga envio de confirmação ao número do cliente.';
COMMENT ON COLUMN public.notification_settings.template_guest_confirmation IS
  'Template enviado ao guest_contact (WhatsApp do hóspede) após cada reserva criada. Aceita os mesmos placeholders do template staff.';

-- Verificacao
SELECT
  'notify_guest ready' AS status,
  notify_guest,
  length(template_guest_confirmation) AS template_chars
FROM public.notification_settings;
