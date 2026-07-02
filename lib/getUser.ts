import { supabase } from "@/lib/supabase";

export const getUserFromLocal = async () => {
  const phone = localStorage.getItem("phone");

  if (!phone) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!user) return null;

  return user;
};
