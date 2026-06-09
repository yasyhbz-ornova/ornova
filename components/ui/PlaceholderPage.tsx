export function PlaceholderPage({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-[28px] border border-silver bg-ivory-soft p-8">
        <p className="text-sm text-sapphire">Ornova by Yas</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-graphite">{title}</h1>
        <p className="mt-5 text-base leading-8 text-graphite/70">{text}</p>
      </div>
    </section>
  );
}
