import { BRAND } from '@/lib/utils/constants'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thepredictionsheet.com'

export type EmailShellArgs = {
  preheader: string
  bodyHtml: string
  /** Full URL to unsubscribe/manage notification preferences */
  unsubscribeUrl?: string
}

/** Shared branded wrapper — table-based inline styles for email client compatibility. */
export function emailShell({ preheader, bodyHtml, unsubscribeUrl }: EmailShellArgs): string {
  const unsubUrl = unsubscribeUrl ?? `${APP_URL}/profile`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>The Prediction Sheet</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${BRAND.white};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND.black};padding:24px 32px;">
              <span style="font-size:18px;font-weight:900;letter-spacing:-0.02em;color:${BRAND.white};">THE PREDICTION SHEET</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${BRAND.black};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                Powered by Envizion Sports
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                <a href="${unsubUrl}" style="color:#a1a1aa;text-decoration:underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailFooterText(unsubscribeUrl?: string): string {
  const unsubUrl = unsubscribeUrl ?? `${APP_URL}/profile`
  return `\n—\nPowered by Envizion Sports\nManage email preferences: ${unsubUrl}`
}

export function ctaButtonHtml(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background-color:${BRAND.lime};">
        <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:${BRAND.black};text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`
}

export { APP_URL }
