import { pdf } from "@react-pdf/renderer";
import { supabase } from "../../utils/supabase";

export const generatePdfBlob = async (docInstance) => {
  return await pdf(docInstance).toBlob();
};

export const uploadPdfBlob = async (bucket, path, blob) => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: "application/pdf", upsert: true });

  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const previewPdfInNewTab = async (docInstance) => {
  const blob = await generatePdfBlob(docInstance);
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
};
