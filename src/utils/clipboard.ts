/**
 * Safely copy text to clipboard with support for sandboxed iframes and other restrictive contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // First, try navigator.clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, attempting fallback copy:", err);
    }
  }

  // Fallback to traditional document.execCommand('copy')
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "10px";
    textarea.style.height = "10px";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    
    return successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}
