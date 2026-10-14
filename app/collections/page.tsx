import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/constants/products";

export const metadata = {
  title: "آرشیو قطعات | Ornova by Yas",
  description: "آرشیو انتخاب‌شده‌ی جواهرات نقره Ornova by Yas.",
};

export default function CollectionsPage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">آرشیو Ornova / انتخاب‌ها</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">قطعاتی که برای ماندن، آرام طراحی شده‌اند.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">این آرشیو، مجموعه‌ای کوچک از قطعات طراحی‌شده‌ی Ornova است. هر قطعه را ببینید، روایت کوتاهش را بخوانید و در صورت تمایل برای بررسی امکان ساخت درخواست بفرستید.</p></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="grid gap-10 md:grid-cols-3">{products.map((product, index) => <Link key={product.slug} href={`/shop/${product.slug}`} className="group"><div className="relative aspect-[4/5] overflow-hidden bg-navy"><Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /><span className="absolute bottom-5 right-5 text-xs text-ivory/60">۰{index + 1} / آرشیو</span></div><p className="mt-5 text-xs text-sapphire">{product.category}</p><h2 className="mt-2 text-xl font-semibold leading-8 text-graphite">{product.name}</h2><p className="mt-3 text-sm leading-7 text-graphite/65">{product.description}</p><p className="mt-4 text-sm text-sapphire">مشاهده پرونده‌ی قطعه</p></Link>)}</div></section>
    </main>
  );
}
