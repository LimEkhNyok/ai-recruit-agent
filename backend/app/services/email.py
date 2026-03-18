import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_verification_email(to_email: str, code: str) -> None:
    settings = get_settings()

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = "您的注册验证码"

    html = f"""\
<div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#333">
  <h2 style="color:#1677ff">注册验证码</h2>
  <p>您好，您的验证码为：</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1677ff;margin:24px 0">{code}</p>
  <p>验证码有效期为 <strong>5 分钟</strong>，请尽快完成注册。</p>
  <p style="color:#999;font-size:12px;margin-top:32px">如非本人操作，请忽略此邮件。</p>
</div>"""
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=True,
        )
        logger.info("验证码邮件已发送至 %s", to_email)
    except aiosmtplib.SMTPException:
        logger.exception("发送验证码邮件失败: %s", to_email)
        raise
