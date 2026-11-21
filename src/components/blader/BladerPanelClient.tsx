"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  Eye,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  LogOut,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { BladerCardModal } from "@/components/blader/BladerCardModal";
import { ComboBuilder } from "@/components/blader/ComboBuilder";
import { uploadBladerAvatar } from "@/lib/avatar-upload";
import { inferComboSystem } from "@/lib/combo-rules";
import { partMatchesQuery } from "@/lib/parts-search";
import {
  toggleInventoryPartAction,
  updateOwnAvatarUrlAction,
  updateOwnBladerProfileAction,
} from "@/app/meu-painel/actions";
import { logoutToHomeAction } from "@/app/auth/actions";
import {
  PART_LINE_ORDER,
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
  type BladerCardProfile,
  type BladerRow,
  type ComboSelection,
  type PartLine,
  type PartRow,
  type PartType,
} from "@/types/domain";

interface BladerPanelClientProps {
  userId: string;
  blader: BladerRow;
  baseCardProfile: BladerCardProfile;
  parts: PartRow[];
  initialInventoryIds: string[];
  googleAvatarUrl: string | null;
  userEmail: string | null;
}

export function BladerPanelClient({
  userId,
  blader,
  baseCardProfile,
  parts,
  initialInventoryIds,
  googleAvatarUrl,
  userEmail,
}: BladerPanelClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"profile" | "collection">(
    "profile"
  );

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) {
      map.set(p.id, p);
    }
    return map;
  }, [parts]);

  // Estado do formulário de perfil
  const [nickname, setNickname] = React.useState(blader.nickname);
  const [name, setName] = React.useState(blader.name);
  const [city, setCity] = React.useState(blader.city ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(blader.avatar_url ?? "");
  const [bio, setBio] = React.useState(blader.bio ?? "");
  const [favoriteAnime, setFavoriteAnime] = React.useState(
    blader.favorite_anime ?? ""
  );
  const [favoriteCombo, setFavoriteCombo] = React.useState<ComboSelection>(() => {
    const blade = blader.favorite_blade_id
      ? (parts.find((p) => p.id === blader.favorite_blade_id) ?? null)
      : null;
    const lockChip = blader.favorite_lock_chip_id
      ? (parts.find((p) => p.id === blader.favorite_lock_chip_id) ?? null)
      : null;
    const overBlade = blader.favorite_over_blade_id
      ? (parts.find((p) => p.id === blader.favorite_over_blade_id) ?? null)
      : null;
    const assistBlade = blader.favorite_assist_blade_id
      ? (parts.find((p) => p.id === blader.favorite_assist_blade_id) ?? null)
      : null;

    return {
      system: inferComboSystem({
        system: blader.favorite_system,
        blade,
        lockChip,
        overBlade,
        assistBlade,
      }),
      bladeId: blader.favorite_blade_id ?? "",
      lockChipId: blader.favorite_lock_chip_id ?? "",
      overBladeId: blader.favorite_over_blade_id ?? "",
      assistBladeId: blader.favorite_assist_blade_id ?? "",
      ratchetId: blader.favorite_ratchet_id ?? "",
      bitId: blader.favorite_bit_id ?? "",
    };
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarNotice, setAvatarNotice] = React.useState<string | null>(null);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Estado da coleção
  const [inventoryIds, setInventoryIds] = React.useState<Set<string>>(
    () => new Set(initialInventoryIds)
  );
  const [pendingPartIds, setPendingPartIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [collectionError, setCollectionError] = React.useState<string | null>(
    null
  );
  const [partSearch, setPartSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | PartType>("all");
  const [lineFilter, setLineFilter] = React.useState<
    "all" | PartLine | "universal"
  >("all");
  const [onlyOwned, setOnlyOwned] = React.useState(false);

  const livePreviewProfile: BladerCardProfile = React.useMemo(
    () => ({
      ...baseCardProfile,
      blader: {
        ...baseCardProfile.blader,
        nickname: nickname.trim() || blader.nickname,
        name: name.trim() || blader.name,
        city: city.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        favorite_anime: favoriteAnime.trim() || null,
        favorite_system: favoriteCombo.system,
        favorite_blade_id: favoriteCombo.bladeId || null,
        favorite_lock_chip_id: favoriteCombo.lockChipId || null,
        favorite_over_blade_id: favoriteCombo.overBladeId || null,
        favorite_assist_blade_id: favoriteCombo.assistBladeId || null,
        favorite_ratchet_id: favoriteCombo.ratchetId || null,
        favorite_bit_id: favoriteCombo.bitId || null,
      },
      favoriteCombo: {
        system: favoriteCombo.system,
        blade: favoriteCombo.bladeId
          ? (partsById.get(favoriteCombo.bladeId) ?? null)
          : null,
        lockChip: favoriteCombo.lockChipId
          ? (partsById.get(favoriteCombo.lockChipId) ?? null)
          : null,
        overBlade: favoriteCombo.overBladeId
          ? (partsById.get(favoriteCombo.overBladeId) ?? null)
          : null,
        assistBlade: favoriteCombo.assistBladeId
          ? (partsById.get(favoriteCombo.assistBladeId) ?? null)
          : null,
        ratchet: favoriteCombo.ratchetId
          ? (partsById.get(favoriteCombo.ratchetId) ?? null)
          : null,
        bit: favoriteCombo.bitId
          ? (partsById.get(favoriteCombo.bitId) ?? null)
          : null,
      },
    }),
    [
      baseCardProfile,
      blader.nickname,
      blader.name,
      nickname,
      name,
      city,
      avatarUrl,
      bio,
      favoriteAnime,
      favoriteCombo,
      partsById,
    ]
  );

  const filteredParts = React.useMemo(() => {
    return parts.filter((part) => {
      if (typeFilter !== "all" && part.part_type !== typeFilter) return false;
      if (lineFilter === "universal" && part.line !== null) return false;
      if (
        lineFilter !== "all" &&
        lineFilter !== "universal" &&
        part.line !== lineFilter
      ) {
        return false;
      }
      if (onlyOwned && !inventoryIds.has(part.id)) return false;
      if (partSearch.trim() && !partMatchesQuery(part, partSearch)) return false;
      return true;
    });
  }, [parts, typeFilter, lineFilter, onlyOwned, inventoryIds, partSearch]);

  const ownedCountByType = React.useMemo(() => {
    const counts: Record<PartType, number> = {
      blade: 0,
      main_blade: 0,
      metal_blade: 0,
      over_blade: 0,
      lock_chip: 0,
      assist_blade: 0,
      ratchet: 0,
      bit: 0,
    };
    for (const partId of inventoryIds) {
      const part = partsById.get(partId);
      if (part) {
        counts[part.part_type] += 1;
      }
    }
    return counts;
  }, [inventoryIds, partsById]);

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarNotice(null);

    try {
      const { publicUrl, sizeKb } = await uploadBladerAvatar(userId, file);
      setAvatarUrl(publicUrl);

      const res = await updateOwnAvatarUrlAction(publicUrl);
      if (res.error) {
        setAvatarError(res.error);
        return;
      }

      setAvatarNotice(`Foto enviada e salva (${sizeKb} KB).`);
      router.refresh();
    } catch (err) {
      setAvatarError(
        err instanceof Error
          ? err.message
          : "Não foi possível processar a imagem."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    const fd = new FormData();
    fd.set("nickname", nickname);
    fd.set("name", name);
    fd.set("city", city);
    fd.set("avatar_url", avatarUrl);
    fd.set("bio", bio);
    fd.set("favorite_anime", favoriteAnime);
    fd.set("favorite_system", favoriteCombo.system ?? "");
    fd.set("favorite_blade_id", favoriteCombo.bladeId);
    fd.set("favorite_lock_chip_id", favoriteCombo.lockChipId);
    fd.set("favorite_over_blade_id", favoriteCombo.overBladeId);
    fd.set("favorite_assist_blade_id", favoriteCombo.assistBladeId);
    fd.set("favorite_ratchet_id", favoriteCombo.ratchetId);
    fd.set("favorite_bit_id", favoriteCombo.bitId);

    const res = await updateOwnBladerProfileAction(fd);
    setSavingProfile(false);

    if (res.error) {
      setProfileError(res.error);
      return;
    }

    setProfileSuccess(true);
    router.refresh();
    setTimeout(() => setProfileSuccess(false), 2500);
  };

  const handleToggleInventory = async (partId: string) => {
    if (pendingPartIds.has(partId)) return;

    const currentlyOwned = inventoryIds.has(partId);
    const nextOwned = !currentlyOwned;

    setCollectionError(null);
    setPendingPartIds((prev) => {
      const next = new Set(prev);
      next.add(partId);
      return next;
    });
    setInventoryIds((prev) => {
      const next = new Set(prev);
      if (nextOwned) next.add(partId);
      else next.delete(partId);
      return next;
    });

    const res = await toggleInventoryPartAction(partId, nextOwned);

    setPendingPartIds((prev) => {
      const next = new Set(prev);
      next.delete(partId);
      return next;
    });

    if (res.error) {
      // Reverte estado otimista
      setInventoryIds((prev) => {
        const next = new Set(prev);
        if (currentlyOwned) next.add(partId);
        else next.delete(partId);
        return next;
      });
      setCollectionError(res.error);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 max-w-5xl space-y-6">
      {/* Header do Painel Pessoal */}
      <Card className="border-border/60 bg-card/70 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-fire-orange via-primary to-fire-yellow" />
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <BladerAvatar
              avatarUrl={avatarUrl || blader.avatar_url}
              nickname={nickname || blader.nickname}
              sizeClass="h-14 w-14"
              textClass="text-lg font-black text-primary"
              borderClass="border-2 border-primary/50 shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground truncate">
                  {nickname || blader.nickname}
                </h1>
                {baseCardProfile.position && (
                  <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] font-black">
                    #{baseCardProfile.position}º no Ranking
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Painel Pessoal do Blader {userEmail ? `• ${userEmail}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="text-xs font-bold gap-1.5 border-primary/40 hover:border-primary"
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              Pré-visualizar meu Card
            </Button>

            <form action={logoutToHomeAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "profile" ? "default" : "outline"}
          onClick={() => setActiveTab("profile")}
          className="text-xs font-bold gap-1.5"
        >
          <User className="h-3.5 w-3.5" />
          Meu Perfil
        </Button>

        <Button
          type="button"
          size="sm"
          variant={activeTab === "collection" ? "default" : "outline"}
          onClick={() => setActiveTab("collection")}
          className="text-xs font-bold gap-1.5"
        >
          <Package className="h-3.5 w-3.5" />
          Minha Coleção ({inventoryIds.size})
        </Button>
      </div>

      {/* ─── ABA 1: MEU PERFIL ───────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <Card className="border-border/60 bg-card/60 overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-black text-foreground">
              Identidade & Combo Favorito
            </CardTitle>
            <CardDescription className="text-xs">
              Essas informações aparecem no seu Card Público quando clicam no seu nome no Ranking ou em Torneios.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Perfil atualizado com sucesso!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-nickname" className="text-xs font-semibold">
                    Apelido / Nickname *
                  </Label>
                  <Input
                    id="prof-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-name" className="text-xs font-semibold">
                    Nome Completo *
                  </Label>
                  <Input
                    id="prof-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-city" className="text-xs font-semibold">
                    Cidade (Amazonas)
                  </Label>
                  <Input
                    id="prof-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Manaus"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-anime" className="text-xs font-semibold">
                    Anime Favorito
                  </Label>
                  <Input
                    id="prof-anime"
                    value={favoriteAnime}
                    onChange={(e) => setFavoriteAnime(e.target.value)}
                    placeholder="Ex: Beyblade Burst / Metal Fight / Beyblade X..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Avatar / Foto de Perfil */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <BladerAvatar
                      avatarUrl={avatarUrl || blader.avatar_url}
                      nickname={nickname || blader.nickname}
                      sizeClass="h-16 w-16"
                      textClass="text-lg font-black text-primary"
                      borderClass="border-2 border-primary/50 shadow-sm"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-foreground">
                        Foto de Perfil
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Recorte automático em quadrado (máx. 400×400px, WebP leve).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold gap-1.5 border-primary/40 hover:border-primary"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-primary" />
                      )}
                      {uploadingAvatar ? "Enviando..." : "Enviar Foto"}
                    </Button>

                    {googleAvatarUrl && avatarUrl !== googleAvatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAvatarUrl(googleAvatarUrl);
                          setAvatarNotice(null);
                          setAvatarError(null);
                        }}
                        className="text-[11px] font-semibold text-primary hover:bg-primary/10"
                      >
                        Usar foto do Google
                      </Button>
                    )}

                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Remover foto"
                        onClick={() => {
                          setAvatarUrl("");
                          setAvatarNotice(null);
                          setAvatarError(null);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {avatarError && (
                  <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-[11px] flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

                {avatarNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{avatarNotice}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label
                    htmlFor="prof-avatar"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Ou informe uma URL externa (opcional)
                  </Label>
                  <Input
                    id="prof-avatar"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarNotice(null);
                    }}
                    placeholder="https://..."
                    className="h-8 text-xs bg-background/70"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="prof-bio" className="text-xs font-semibold">
                    Bio / Estilo de Jogo
                  </Label>
                  <span
                    className={`text-[11px] tabular-nums ${
                      bio.length >= 150
                        ? "text-fire-orange font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {bio.length}/160
                  </span>
                </div>
                <Textarea
                  id="prof-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  maxLength={160}
                  rows={2}
                  placeholder="Conte brevemente sobre seu estilo na arena ou meta favorito..."
                  className="text-xs"
                />
              </div>

              {/* Combo Favorito */}
              <ComboBuilder
                parts={parts}
                value={favoriteCombo}
                onChange={setFavoriteCombo}
                title="Combo Favorito (Busca por nome Takara Tomy ou Hasbro)"
                subtitle="Selecione o sistema do Beyblade e monte suas peças seguindo as regras oficiais de compatibilidade."
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Pré-visualizar meu Card
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={savingProfile}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
                >
                  {savingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── ABA 2: MINHA COLEÇÃO ────────────────────────────────────────── */}
      {activeTab === "collection" && (
        <div className="space-y-4">
          {collectionError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{collectionError}</span>
            </div>
          )}

          {/* Resumo + Filtros */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-foreground">
                    Inventário de Peças ({inventoryIds.size} selecionadas)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Marque as peças que você possui. A busca encontra nomes Takara Tomy e equivalentes Hasbro.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={onlyOwned ? "default" : "outline"}
                  onClick={() => setOnlyOwned((prev) => !prev)}
                  className="text-xs font-bold shrink-0"
                >
                  {onlyOwned
                    ? `Mostrando minha coleção (${inventoryIds.size})`
                    : "Filtrar apenas minha coleção"}
                </Button>
              </div>

              {/* Contadores rápidos */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {PART_TYPE_ORDER.map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="border-border/60 text-muted-foreground"
                  >
                    {PART_TYPE_LABELS[type]}:{" "}
                    <strong className="text-foreground ml-1">
                      {ownedCountByType[type]}
                    </strong>
                  </Badge>
                ))}
              </div>

              {/* Busca e filtros */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    placeholder="Buscar peça (ex: WizardRod, Wand Wizard, 9-60, Ball)..."
                    className="pl-9 h-9 text-xs bg-background/60"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(["all", ...PART_LINE_ORDER, "universal"] as const).map(
                    (line) => (
                      <Button
                        key={line}
                        type="button"
                        size="xs"
                        variant={lineFilter === line ? "default" : "outline"}
                        onClick={() => setLineFilter(line)}
                        className="font-bold"
                      >
                        {line === "all"
                          ? "Todas Linhas"
                          : line === "universal"
                            ? "Universal"
                            : line}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant={typeFilter === "all" ? "default" : "outline"}
                  onClick={() => setTypeFilter("all")}
                  className="font-bold"
                >
                  Todos Tipos ({parts.length})
                </Button>
                {PART_TYPE_ORDER.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="xs"
                    variant={typeFilter === type ? "default" : "outline"}
                    onClick={() => setTypeFilter(type)}
                    className="font-bold"
                  >
                    {PART_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grid de Peças */}
          {filteredParts.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card/40 p-10 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma peça encontrada com os filtros atuais.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredParts.map((part) => {
                const owned = inventoryIds.has(part.id);
                const pending = pendingPartIds.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    disabled={pending}
                    onClick={() => void handleToggleInventory(part.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      owned
                        ? "border-primary/60 bg-primary/15 shadow-sm"
                        : "border-border/60 bg-card/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground truncate">
                          {part.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-border/70 text-muted-foreground"
                        >
                          {PART_TYPE_LABELS[part.part_type]}
                          {part.line ? ` • ${part.line}` : ""}
                        </Badge>
                      </div>
                      {part.aliases && part.aliases.length > 0 && (
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          Hasbro: {part.aliases.join(", ")}
                        </div>
                      )}
                    </div>

                    <div
                      className={`h-6 w-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        owned
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/70 bg-background/60 text-transparent"
                      }`}
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BladerCardModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        previewProfile={livePreviewProfile}
      />
    </div>
  );
}
