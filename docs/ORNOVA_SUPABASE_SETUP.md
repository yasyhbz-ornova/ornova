# راه‌اندازی Supabase برای ORNOVA

این پروژه کد client/server، callback ورود، proxy session، API درخواست و migration را آماده دارد. پروژه‌ی اختصاصی ORNOVA با ref `urtufzyhqgwszmufhkyt` در منطقه‌ی Frankfurt ساخته شده و migration اصلی آن با موفقیت اجرا شده است.

## متغیرهای محیطی

فایل `.env.local` را از روی `.env.local.example` بسازید و فقط این مقادیر را تنظیم کنید:

```env
NEXT_PUBLIC_SUPABASE_URL=https://urtufzyhqgwszmufhkyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=کلید publishable پروژه، فقط در محیط محلی/استقرار
NEXT_PUBLIC_SITE_URL=https://ornova.ir
```

`SUPABASE_SERVICE_ROLE_KEY` برای این وب‌سایت لازم نیست و نباید در client، repository یا log قرار گیرد.

## Migration

فایل زیر در SQL Editor پروژه‌ی اختصاصی ORNOVA اجرا شده است:

```text
supabase/migrations/001_ornova_core.sql
```

این migration جدول‌های `profiles`، `inquiries`، `inquiry_items` و `inquiry_files`، RLS و bucket خصوصی `ornova-private` را می‌سازد.

## Auth redirect

در Supabase Dashboard، این URLها را در Auth → URL Configuration ثبت کنید:

- Site URL: `https://ornova.ir`
- Redirect URL: `https://ornova.ir/auth/callback?next=/account`
- برای توسعه: `http://localhost:3000/auth/callback?next=/account`

## بررسی پس از اتصال

1. ورود با magic link را در `/login` تست کنید.
2. ثبت درخواست authenticated را در `/contact` تست کنید.
3. بارگذاری فایل JPG/PNG/WebP/PDF حداکثر ۱۰ مگابایت را تست کنید.
4. در Storage مطمئن شوید bucket `ornova-private` public نیست.
5. با یک کاربر دیگر بررسی کنید که inquiry و فایل کاربر اول قابل مشاهده نباشد.
6. `npm.cmd run lint`، `npm.cmd run build` و `git status -sb` را اجرا کنید.
