"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  House,
  Settings,
  Package,
  ShoppingBag,
  ClipboardCheck,
  ChartNoAxesCombined,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Guide } from "./guide";
import { logout } from "@/app/actions/auth";
import type { Profile, Business } from "@/lib/types";

const navigation = [
  { href: "/inicio", label: "Inicio", icon: House, paths: ["/inicio"] },
  {
    href: "/productos",
    label: "Catálogo/Categorías",
    icon: Package,
    paths: ["/productos", "/catalogo", "/movimientos"],
  },
  {
    href: "/ventas",
    label: "Ventas",
    icon: ShoppingBag,
    paths: ["/ventas", "/devoluciones", "/ofertas"],
  },
  {
    href: "/inventarios",
    label: "Contar stock",
    icon: ClipboardCheck,
    paths: ["/inventarios"],
  },
  {
    href: "/analisis",
    label: "Resumen",
    icon: ChartNoAxesCombined,
    paths: ["/analisis", "/gastos"],
  },
];

export function Shell({
  profile,
  business,
  children,
}: {
  profile: Profile;
  business: Business;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links =
    profile.role === "boss"
      ? [
          ...navigation,
          {
            href: "/configuracion",
            label: "Administración",
            icon: Settings,
            paths: ["/configuracion", "/empleados"],
          },
        ]
      : navigation;
  const current = links.find((link) =>
    link.paths.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    ),
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Ir al contenido
      </a>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Package size={24} />
          </span>
          <strong>{business.name}</strong>
          <button
            className="mobile-close icon-button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Navegación principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link prefetch={false}
              key={href}
              href={href}
              className={`nav-link ${current?.href === href ? "active" : ""}`}
              aria-current={current?.href === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      {open && (
        <button
          className="menu-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <button
              className="icon-button menu-toggle"
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <strong>{current?.label ?? "Mi cuenta"}</strong>
          </div>
          <div className="topbar-actions">
            <Guide supportEmail={business.support_email} />
            <Link prefetch={false} href="/cuenta" className="user-link">
              {profile.name}
            </Link>
            <form action={logout}>
              <button
                className="icon-button"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={19} />
              </button>
            </form>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
