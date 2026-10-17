import { RitualArchiveConcept } from "@/components/ornova/RitualArchiveConcept";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ornova by Yas",
    url: "https://ornova.ir",
    description: "طراحی دیجیتال و قابل ساخت جواهرات نقره برای خاطره‌ها و نشانه‌های شخصی.",
  };

  return <><RitualArchiveConcept /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></>;
}
