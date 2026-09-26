import { useState, useRef } from "react";
import { Camera, Trash2, X } from "lucide-react";
import type { BodyPhoto } from "@/lib/nutrisnap-storage";

interface BodyProgressProps {
  photos: BodyPhoto[];
  userWeight?: number | null;
  onAdd: (photo: { date: string; weight?: number; imageDataUrl: string; notes?: string }) => Promise<BodyPhoto>;
  onDelete: (id: string) => Promise<void>;
}

function resizeImage(file: File, maxWidth = 400): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function BodyProgress({ photos, userWeight, onAdd, onDelete }: BodyProgressProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>(userWeight?.toString() || "");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<BodyPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setPreview(resized);
    setShowUpload(true);
  };

  const handleSave = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await onAdd({
        date: today,
        weight: weight ? Number(weight) : undefined,
        imageDataUrl: preview,
        notes: notes || undefined,
      });
      setShowUpload(false);
      setPreview(null);
      setWeight(userWeight?.toString() || "");
      setNotes("");
    } catch (err) {
      console.error("Failed to save photo:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    await onDelete(id);
    setSelectedPhoto(null);
  };

  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:rounded-[24px] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Progress</p>
          <h2 className="mt-1 font-display text-xl tracking-[-.04em] sm:text-2xl">Body photos</h2>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-105"
        >
          <Camera size={14} /> Add photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Upload dialog */}
      {showUpload && preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">New progress photo</h3>
              <button onClick={() => { setShowUpload(false); setPreview(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <img src={preview} alt="Preview" className="w-full rounded-xl object-cover max-h-64" />
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Weight (kg, optional)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 75"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How are you feeling?"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
              >
                {uploading ? "Saving..." : "Save photo"}
              </button>
              <button
                type="button"
                onClick={() => { setShowUpload(false); setPreview(null); }}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold transition hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen view */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-2 -right-2 z-10 rounded-full bg-background p-1.5 shadow-lg">
              <X size={16} />
            </button>
            <img src={selectedPhoto.imageDataUrl} alt={`Progress ${selectedPhoto.date}`} className="w-full rounded-2xl object-cover" />
            <div className="mt-3 flex items-center justify-between rounded-xl bg-background/90 px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{selectedPhoto.date}</span>
                {selectedPhoto.weight != null && <span className="ml-2 text-muted-foreground">{selectedPhoto.weight} kg</span>}
                {selectedPhoto.notes && <span className="ml-2 text-muted-foreground italic">"{selectedPhoto.notes}"</span>}
              </div>
              <button onClick={() => handleDelete(selectedPhoto.id)} className="text-destructive hover:text-destructive/80">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {sorted.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sorted.slice(0, 12).map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedPhoto(photo)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border transition hover:border-primary"
            >
              {photo.imageDataUrl ? (
                <img src={photo.imageDataUrl} alt={`Progress ${photo.date}`} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center bg-muted text-xs text-muted-foreground">No image</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <p className="text-[10px] font-medium text-white">{photo.date}</p>
                {photo.weight != null && <p className="text-[10px] text-white/80">{photo.weight} kg</p>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
          <Camera size={24} className="text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No progress photos yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Track your visual progress over time</p>
        </div>
      )}

      {sorted.length > 1 && (
        <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium">{sorted.length} photos</span> tracked · First: {sorted[sorted.length - 1].date} · Latest: {sorted[0].date}
        </div>
      )}
    </div>
  );
}
