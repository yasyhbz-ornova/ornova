import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/lib/constants/products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[28px] border border-silver bg-silver-muted p-5">
        <div className="aspect-square rounded-[22px] border border-silver bg-ivory-soft" />
      </div>
      <div className="self-center">
        <Link href="/shop" className="text-sm text-sapphire">بازگشت به فروشگاه</Link>
        <p className="mt-8 text-sm text-sapphire">{product.category}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">{product.name}</h1>
        <p className="mt-5 text-base leading-8 text-graphite/75">{product.description}</p>
        <p className="mt-6 text-xl font-semibold text-graphite">درخواست قیمت</p>

        <div className="mt-8 grid gap-3 text-sm text-graphite/75 sm:grid-cols-2">
          <div className="rounded-[18px] border border-silver bg-ivory-soft p-4">
            <span className="block text-graphite">جنس</span>
            <span className="mt-2 block">{product.material}</span>
          </div>
          <div className="rounded-[18px] border border-silver bg-ivory-soft p-4">
            <span className="block text-graphite">پرداخت</span>
            <span className="mt-2 block">{product.finish}</span>
          </div>
        </div>

        <button className="mt-8 rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">
          افزودن به سبد درخواست
        </button>
      </div>
    </div>
  );
}
