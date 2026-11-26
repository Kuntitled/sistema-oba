"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { deleteBladerAction } from "@/app/admin/actions";

export function DeleteBladerButton({
  bladerId,
  bladerNickname,
}: {
  bladerId: string;
  bladerNickname: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Tem certeza que deseja remover o Blader "${bladerNickname}"? Seus registros de ranking serão recalculados.`
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await deleteBladerAction(bladerId);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Blader "${bladerNickname}" removido.`);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Excluir Blader"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
