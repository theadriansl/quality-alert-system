import cv2
import os

video_path = r"C:\Users\The Eidrian\Pictures\Programa.mp4"
output_dir = r"C:\Users\The Eidrian\Pictures\frames"

# Crear directorio de salida si no existe
os.makedirs(output_dir, exist_ok=True)

# Abrir el video
cap = cv2.VideoCapture(video_path)

# Obtener información del video
fps = int(cap.get(cv2.CAP_PROP_FPS))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"Video info:")
print(f"  FPS: {fps}")
print(f"  Total frames: {total_frames}")
print(f"  Duration: {duration:.2f} seconds")

# Extraer 1 frame cada 3 segundos
interval = fps * 3  # cada 3 segundos
frame_count = 0
saved_count = 0

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Guardar frame cada intervalo
    if frame_count % interval == 0:
        output_path = os.path.join(output_dir, f"frame_{saved_count:03d}.jpg")
        cv2.imwrite(output_path, frame)
        print(f"Saved: {output_path} (at {frame_count/fps:.1f}s)")
        saved_count += 1

    frame_count += 1

cap.release()
print(f"\nExtraction complete! Saved {saved_count} frames to {output_dir}")
