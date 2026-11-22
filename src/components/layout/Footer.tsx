import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import {
  DiscordIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/SocialIcons";
import { OBA_SOCIAL_LINKS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/60 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & description */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/40 shrink-0">
              <Image
                src="/images/logo.jpg"
                alt="OBA Beyblade X"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm">
                <span className="text-fire-gradient">OBA</span>
                <span className="text-muted-foreground font-normal text-xs">
                  — Organização de Beyblade do Amazonas
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organização oficial de torneios, ranking e comunidade no Amazonas.
              </p>
            </div>
          </div>

          {/* Rules & Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-fire-orange font-semibold">
              <Flame className="h-3.5 w-3.5" />
              Regras Oficiais BX
            </span>
            <span className="text-border">•</span>
            <Link href="/" className="hover:text-foreground transition-colors">
              Ranking
            </Link>
            <span className="text-border">•</span>
            <Link href="/torneios" className="hover:text-foreground transition-colors">
              Torneios
            </Link>
            <span className="text-border">•</span>
            <Link href="/bladers" className="hover:text-foreground transition-colors">
              Bladers
            </Link>
            <span className="text-border">•</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <span className="text-border">•</span>
            <Link href="/admin" className="hover:text-primary transition-colors font-medium">
              Admin
            </Link>
          </div>

          {/* Redes Sociais */}
          <div className="flex items-center gap-2">
            <a
              href={OBA_SOCIAL_LINKS.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Instagram (${OBA_SOCIAL_LINKS.instagram.handle})`}
              aria-label="Instagram da OBA"
              className="h-8 w-8 rounded-full border border-border/60 bg-background/50 hover:border-pink-500/60 hover:text-pink-500 text-muted-foreground flex items-center justify-center transition-colors"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href={OBA_SOCIAL_LINKS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              title={OBA_SOCIAL_LINKS.whatsapp.label}
              aria-label="Grupo no WhatsApp da OBA"
              className="h-8 w-8 rounded-full border border-border/60 bg-background/50 hover:border-emerald-500/60 hover:text-emerald-500 text-muted-foreground flex items-center justify-center transition-colors"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
            <a
              href={OBA_SOCIAL_LINKS.discord.url}
              target="_blank"
              rel="noopener noreferrer"
              title={OBA_SOCIAL_LINKS.discord.label}
              aria-label="Discord da OBA"
              className="h-8 w-8 rounded-full border border-border/60 bg-background/50 hover:border-indigo-500/60 hover:text-indigo-400 text-muted-foreground flex items-center justify-center transition-colors"
            >
              <DiscordIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
          <p>© 2026 Organização de Beyblade do Amazonas. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Beyblade X é marca registrada da Takara Tomy. Sistema de fãs para a comunidade.
          </p>
        </div>
      </div>
    </footer>
  );
}
