import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade e proteção de dados da Organização de Beyblade do Amazonas (Liga OBA).",
};

export default function PrivacidadePage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a página inicial
      </Link>

      <Card className="border-border/60 bg-card/70 overflow-hidden shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-fire-orange via-primary to-fire-yellow" />
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Política de Privacidade — Liga OBA
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Organização de Beyblade do Amazonas • Última atualização: Novembro de 2026
              </p>
            </div>
          </div>

          <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-black text-foreground">
                1. Dados Coletados
              </h2>
              <p>
                Ao autenticar-se com sua conta Google ou e-mail no{" "}
                <strong className="text-foreground">Sistema OBA</strong>, coletamos apenas as informações básicas fornecidas pelo provedor de autenticação: nome, endereço de e-mail e URL da foto de perfil.
              </p>
              <p>
                No seu Painel Pessoal (<code>/meu-painel</code>), você também pode preencher ou atualizar voluntariamente seu apelido (nickname), bio, anime favorito, combo favorito e coleção de peças, além de acompanhar seu histórico público de torneios e pontuação no ranking estadual.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-foreground">
                2. Finalidade de Uso
              </h2>
              <p>Os dados coletados são utilizados exclusivamente para:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Autenticação segura e vínculo do jogador ao seu perfil oficial na Liga OBA;</li>
                <li>Exibição do Ranking Geral, resultados de torneios e Card Público do Blader;</li>
                <li>Organização de etapas, chaveamentos, conferência de decklists e inscrições.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-foreground">
                3. Armazenamento e Compartilhamento
              </h2>
              <p>
                As informações são armazenadas com segurança na infraestrutura gerenciada do{" "}
                <strong className="text-foreground">Supabase</strong> (PostgreSQL e Supabase Auth com políticas de segurança por linha — RLS). Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais ou publicitários.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-foreground">
                4. Direitos do Titular (LGPD) e Contato
              </h2>
              <p>
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você pode editar as informações do seu perfil a qualquer momento em{" "}
                <Link href="/meu-painel" className="text-primary hover:underline font-semibold">
                  /meu-painel
                </Link>
                , ou solicitar o desvínculo e a exclusão da sua conta entrando em contato com a diretoria da OBA pelo e-mail{" "}
                <a
                  href="mailto:matheuskzero@gmail.com"
                  className="text-primary hover:underline font-semibold"
                >
                  matheuskzero@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
