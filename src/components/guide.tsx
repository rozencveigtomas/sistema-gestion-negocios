"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, X } from "lucide-react";

const topics = [
  {
    path: "/productos/nuevo",
    title: "Agregar producto",
    text: "Completá nombre, código, categoría, precios y stock. Color y talle son opcionales. Más datos contiene proveedor, marca y notas.",
  },
  {
    path: "/productos",
    title: "Productos y stock",
    text: "Buscá por nombre o código. Abrí un producto para registrar una compra. Las ventas se registran desde Ventas para guardar también el cobro.",
  },
  {
    path: "/catalogo",
    title: "Categorías y ubicaciones",
    text: "Las categorías agrupan productos. La ubicación indica dónde se guardan. Creá al menos una de cada una antes de agregar productos.",
  },
  {
    path: "/movimientos",
    title: "Historial de stock",
    text: "Cada fila muestra qué cambió, quién lo hizo y cuánto stock quedó. Las correcciones conservan el historial.",
  },
  {
    path: "/ventas",
    title: "Registrar venta",
    text: "Elegí los productos y cantidades, seleccioná cómo se paga y confirmá. Las ofertas vigentes se aplican al guardar. Nueva venta prepara el siguiente cobro.",
  },
  {
    path: "/devoluciones",
    title: "Devoluciones",
    text: "Elegí el artículo de la venta, la cantidad y el dinero a devolver. Solo vuelve al stock si está en condiciones de venderse.",
  },
  {
    path: "/inventarios",
    title: "Contar stock",
    text: "El jefe inicia un conteo. Se pausan las ventas del comercio mientras se cuenta. Guardá la cantidad física de cada producto. El jefe revisa las diferencias y aprueba o pide volver a contar.",
  },
  {
    path: "/ofertas",
    title: "Ofertas",
    text: "Elegí producto o categoría, porcentaje y fechas. Se aplica la oferta que más reduce el precio. No se suman descuentos.",
  },
  {
    path: "/analisis",
    title: "Resumen del día",
    text: "Elegí una fecha. El jefe ve ventas, costos, gastos, devoluciones y ganancia estimada. El empleado ve únicamente su actividad.",
  },
  {
    path: "/gastos",
    title: "Gastos",
    text: "Ingresá concepto, importe, categoría y medio de pago. Los datos adicionales están en Más datos.",
  },
  {
    path: "/empleados",
    title: "Empleados",
    text: "Invitá por correo. Cada persona elige su contraseña. Desactivar una cuenta conserva su historial. Debe quedar al menos un jefe activo.",
  },
  {
    path: "/configuracion",
    title: "Administración",
    text: "Administrá empleados y datos del comercio. Categorías y proveedores se encuentran dentro de Catálogo/Categorías.",
  },
  {
    path: "/acceso",
    title: "Acceso y contraseña",
    text: "Ingresá con tu correo y contraseña. Si la olvidaste, usá Olvidé mi contraseña. La cuenta debe estar habilitada por el jefe.",
  },
  {
    path: "/recuperar",
    title: "Recuperar contraseña",
    text: "Ingresá el correo de tu cuenta y abrí el último enlace recibido. El enlace es temporal y solo puede usarse una vez.",
  },
  {
    path: "/contrasena",
    title: "Elegir contraseña",
    text: "Usá al menos doce caracteres y repetí la misma contraseña para confirmar.",
  },
];
export function Guide({ supportEmail }: { supportEmail?: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const topic = topics.find(
    (item) => path === item.path || path.startsWith(`${item.path}/`),
  ) ?? {
    title: "Primeros pasos",
    text: "Desde Inicio podés vender, consultar productos o contar stock. El menú te lleva a cada tarea.",
  };
  return (
    <>
      <button
        className="guide-button"
        onClick={() => dialog.current?.showModal()}
      >
        <CircleHelp size={19} />
        Guía
      </button>
      <dialog
        className="guide-dialog"
        ref={dialog}
        aria-labelledby="guide-title"
      >
        <header>
          <h2 id="guide-title">Guía de uso</h2>
          <button
            className="icon-button"
            onClick={() => dialog.current?.close()}
            aria-label="Cerrar guía"
          >
            <X />
          </button>
        </header>
        <div className="guide-body">
          <h3>{topic.title}</h3>
          <p>{topic.text}</p>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>Contactar soporte</a>
          ) : (
            <p className="muted">
              Si necesitás ayuda, contactá al jefe del comercio.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
