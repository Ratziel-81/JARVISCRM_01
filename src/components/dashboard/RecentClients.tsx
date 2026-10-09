import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ESTADO_CLIENTE_STYLES, clientesRecientes, type Cliente } from "../../data/mockData";
import { api } from "../../lib/api";
import AvatarTile from "../common/AvatarTile";

export default function RecentClients() {
  const [items, setItems] = useState<Cliente[]>(clientesRecientes);

  useEffect(() => {
    let vivo = true;
    api
      .clientes()
      .then((d) => {
        if (vivo && Array.isArray(d) && d.length > 0) setItems(d.slice(0, 4));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className="jarvis-card anim-rise stagger-5 h-full p-5" aria-label="Clientes recientes">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">Clientes Recientes</h2>
        <Link to="/clientes" className="flex items-center gap-1 text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">
          Ver <ArrowRight size={13} />
        </Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              to="/clientes"
              className="jarvis-row flex items-center gap-3 rounded-xl p-2.5"
            >
              <AvatarTile color={c.avatarColor} iniciales={c.iniciales} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">{c.nombre}</span>
                <span className="block font-mono text-[11px] text-slate-500">{c.hace}</span>
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_CLIENTE_STYLES[c.estado]}`}>
                {c.estado}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
