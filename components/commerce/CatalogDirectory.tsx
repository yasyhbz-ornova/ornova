import Link from "next/link";
import { catalogCategories, catalogFamilies, catalogHref } from "@/lib/constants/catalog";
import styles from "./CatalogDirectory.module.css";

export function CatalogDirectory({ label = "همهٔ دسته‌های فروشگاه" }: { label?: string }) {
  return <nav aria-label={label} className={styles.directory}>
    {catalogFamilies.map((family) => <div key={family.id} className={styles.family}>
      <p className={styles.label}>{family.label}</p>
      <ul className={styles.links}>{catalogCategories.filter((category) => category.family === family.id).map((category) =>
        <li key={category.id}><Link href={catalogHref(category.id)}>{category.label}<span aria-hidden="true">↖</span></Link></li>
      )}</ul>
    </div>)}
  </nav>;
}
