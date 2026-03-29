import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

export function useSupabaseStore(table, fieldsMapping) {
  const [val, setVal] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        const mapped = data.map(item => {
          const newItem = {};
          for (const [stateField, dbField] of Object.entries(fieldsMapping)) {
             newItem[stateField] = item[dbField];
          }
          return newItem;
        });
        setVal(mapped);
      }
      setReady(true);
    })();
  }, [table]);

  const refresh = async () => {
    const { data } = await supabase.from(table).select('*');
    if (data) {
      setVal(data.map(d => {
         const mapped = {};
         for (const [sF, dF] of Object.entries(fieldsMapping)) { mapped[sF] = d[dF]; }
         return mapped;
      }));
    }
  };

  const saveOne = async (item) => {
    const dbItem = {};
    for (const [stateField, dbField] of Object.entries(fieldsMapping)) {
      if (item[stateField] !== undefined) {
        dbItem[dbField] = item[stateField];
      }
    }
    const { error } = await supabase.from(table).upsert(dbItem);
    if (error) toast.error(`Error guardando ${table}: ${error.message}`);
    else refresh();
  };

  const deleteOne = async (idField, idVal) => {
    const dbField = fieldsMapping[idField] || idField;
    const { error } = await supabase.from(table).delete().eq(dbField, idVal);
    if (error) toast.error(`Error eliminando en ${table}: ${error.message}`);
    else refresh();
  };

  return [val, saveOne, deleteOne, ready, refresh];
}
