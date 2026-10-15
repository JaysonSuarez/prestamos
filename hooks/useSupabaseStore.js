import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

export function useSupabaseStore(table, fieldsMapping) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapping = useRef(fieldsMapping);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    setItems(
      (data || []).map((row) =>
        Object.fromEntries(
          Object.entries(mapping.current).map(([field, column]) => [
            field,
            row[column],
          ]),
        ),
      ),
    );
    setLoadError(null);
  }, [table]);
  useEffect(() => {
    let mounted = true;
    setReady(false);
    refresh()
      .catch((error) => {
        if (mounted) setLoadError(error);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [refresh]);
  const saveOne = async (item) => {
    const encode = (value) =>
      Object.fromEntries(
        Object.entries(mapping.current)
          .filter(([field]) => value[field] !== undefined)
          .map(([field, column]) => [column, value[field]]),
      );
    const { error } = await supabase
      .from(table)
      .upsert(Array.isArray(item) ? item.map(encode) : encode(item));
    if (error) throw error;
    const saved = Array.isArray(item) ? item : [item];
    const primaryField = Object.keys(mapping.current)[0];
    setItems(current => {
      const next = [...current];
      for (const row of saved) {
        const index = next.findIndex(existing => existing[primaryField] === row[primaryField]);
        if (index >= 0) next[index] = { ...next[index], ...row };
        else next.push(row);
      }
      return next;
    });
    await refresh().catch(() => {
      toast.warn("Los cambios se guardaron, pero no se pudo actualizar la vista. Recarga para sincronizar.");
    });
  };
  const deleteOne = async (field, value) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(mapping.current[field] || field, value);
    if (error) throw error;
    setItems(current => current.filter(item => item[field] !== value));
    await refresh().catch(() => {
      toast.warn("El registro se eliminó, pero no se pudo actualizar la vista. Recarga para sincronizar.");
    });
  };
  return [items, saveOne, deleteOne, ready, refresh, loadError];
}
