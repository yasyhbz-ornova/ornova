import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

export const metadata = {
  title: "ورود به حساب Ornova | Ornova by Yas",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <div className="rounded-[30px] border border-silver bg-ivory-soft p-7 md:p-10">
        <p className="text-sm text-sapphire">حساب Ornova</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">ورود به حساب Ornova</h1>
        <p className="mt-5 text-base leading-8 text-graphite/70">ایمیل‌تان را وارد کنید تا لینک ورود یک‌بارمصرف برای شما ارسال شود. رمز عبور در Ornova ذخیره نمی‌شود.</p>
        <MagicLinkForm />
      </div>
    </div>
  );
}
