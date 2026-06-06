import matplotlib.pyplot as plt
import os
import imageio.v3 as imageio
import glob

class Visualizer:
    def __init__(self, output_dir="frames"):
        self.output_dir = output_dir
        self.frame_count = 0
        if not os.path.exists(output_dir): 
            os.makedirs(output_dir)
        for f in glob.glob(f"{self.output_dir}/*.png"):
            os.remove(f)

    def capture(self, state, title="Algoritmo"):
        plt.figure(figsize=(6, 4))
        plt.bar(range(len(state)), state, color='skyblue')
        plt.ylim(0, max(state) + 1 if state else 10)
        plt.title(f"{title} - Paso {self.frame_count}")
        
        filename = f"{self.output_dir}/frame_{self.frame_count:04d}.png"
        plt.savefig(filename)
        plt.close()
        self.frame_count += 1

    def save_animation(self, filename="animation.gif", duration=500):
        """Une todos los frames PNG en un solo GIF."""
        frames = sorted(glob.glob(f"{self.output_dir}/frame_*.png"))
        if not frames:
            raise ValueError("No hay frames para crear la animación.")
        
        gif_path = f"{self.output_dir}/{filename}"
        images = [imageio.imread(f) for f in frames]
        imageio.imwrite(gif_path, images, duration=duration, loop=0)
        
        return gif_path