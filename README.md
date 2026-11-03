# مُدارسة

تطبيق أندرويد لمتابعة قراءة 8 كتب والمدارسة فيها. مبني بـ Capacitor 8.

## التوقيع للنشر على APKPure (مرة واحدة)

1. في المستودع افتح **Actions** ثم **Create Keystore (run once)** ثم **Run workflow** واكتب كلمة مرور (احفظها).
2. بعد انتهائه حمّل الملف المضغوط `keystore` من أسفل صفحة التشغيل، وافتح `keystore-base64.txt` وانسخ محتواه كله.
3. من **Settings** ثم **Secrets and variables** ثم **Actions** أضف سرّين:
   - `KEYSTORE_BASE64`: النص الذي نسخته.
   - `KEYSTORE_PASSWORD`: كلمة المرور.
4. احتفظ بنسخة من `modarasa.jks` وكلمة المرور في مكان آمن. أي تحديث مستقبلي على APKPure يجب أن يُوقَّع بنفس المفتاح.
5. شغّل **Build APK**. ملف `modarasa.apk` في **Releases** يكون موقّعًا وجاهزًا للرفع.
