"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./GalleryPhoneNotebook.module.css";

const tabs = [
  { id: "about", label: "دربارهٔ اُرنوا" },
  { id: "telephone", label: "تلفن", unavailable: "شمارهٔ تماس اُرنوا هنوز منتشر نشده است.", action: "تماس با اُرنوا" },
  { id: "email", label: "ایمیل", unavailable: "نشانی ایمیل اُرنوا هنوز منتشر نشده است.", action: "نوشتن ایمیل" },
  { id: "instagram", label: "اینستاگرام", unavailable: "نشانی اینستاگرام اُرنوا هنوز منتشر نشده است.", action: "دیدن صفحهٔ اُرنوا در اینستاگرام" },
  { id: "telegram", label: "تلگرام", unavailable: "نشانی تلگرام اُرنوا هنوز منتشر نشده است.", action: "دیدن اُرنوا در تلگرام" },
] as const;

type ContactLink = { href: string; value: string };

function phoneLink(value: string | undefined): ContactLink | null {
  const phone = value?.trim();
  return phone && /^\+[1-9][0-9]{7,14}$/.test(phone) ? { href: `tel:${phone}`, value: phone } : null;
}

function emailLink(value: string | undefined): ContactLink | null {
  const email = value?.trim();
  const address = /^[a-z0-9_+\-]+(?:\.[a-z0-9_+\-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
  return email && email.length <= 254 && address.test(email) ? { href: `mailto:${email}`, value: email } : null;
}

function profileLink(value: string | undefined, platform: "instagram" | "telegram"): ContactLink | null {
  const profile = platform === "instagram"
    ? /^https:\/\/(?:www\.)?instagram\.com\/([a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?)\/?$/i
    : /^https:\/\/t\.me\/([a-z][a-z0-9_]{4,31})\/?$/i;
  const handle = value?.trim().match(profile)?.[1];
  if (!handle || handle.includes("..")) return null;

  const host = platform === "instagram" ? "www.instagram.com" : "t.me";
  return { href: `https://${host}/${handle}`, value: `@${handle}` };
}

const publicContact = {
  telephone: phoneLink(process.env.NEXT_PUBLIC_ORNOVA_CONTACT_PHONE),
  email: emailLink(process.env.NEXT_PUBLIC_ORNOVA_CONTACT_EMAIL),
  instagram: profileLink(process.env.NEXT_PUBLIC_ORNOVA_CONTACT_INSTAGRAM, "instagram"),
  telegram: profileLink(process.env.NEXT_PUBLIC_ORNOVA_CONTACT_TELEGRAM, "telegram"),
};

export function GalleryPhoneNotebook() {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function selectByKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % tabs.length; break;
      case "ArrowUp": next = (index + tabs.length - 1) % tabs.length; break;
      case "Home": next = 0; break;
      case "End": next = tabs.length - 1; break;
      default: return;
    }

    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className={styles.notebook} dir="rtl">
      <header className={styles.header}>
        <h1 id="gallery-drawer-title" tabIndex={-1}>دفتر تلفن اُرنوا</h1>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="بخش‌های دفتر تلفن" aria-orientation="vertical">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => { buttons.current[index] = node; }}
            id={`${id}-${tab.id}-tab`}
            className={styles.tab}
            type="button"
            role="tab"
            aria-selected={index === selected}
            aria-controls={`${id}-${tab.id}-panel`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => selectByKey(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => {
        const link = tab.id === "about" ? null : publicContact[tab.id];
        return (
          <section
            key={tab.id}
            id={`${id}-${tab.id}-panel`}
            className={styles.leaf}
            role="tabpanel"
            aria-labelledby={`${id}-${tab.id}-tab`}
            tabIndex={0}
            hidden={index !== selected}
          >
            <h2 className={styles.entryTitle}>{tab.id === "about" ? "یادداشت یاس" : tab.label}</h2>
            {tab.id === "about" ? (
              <p className={styles.entryText}>اُرنوا گالری جواهرات نقره با طراحی دیجیتال یاس است. در این گالری می‌توانی آثار و شناسنامهٔ هر قطعه را ببینی.</p>
            ) : link ? (
              <a className={styles.contactLink} href={link.href}>
                <span>{tab.action}</span>
                <bdi dir="ltr">{link.value}</bdi>
              </a>
            ) : <p className={styles.entryText}>{tab.unavailable}</p>}
          </section>
        );
      })}
    </div>
  );
}
