import matplotlib.pyplot as plt
import os

class Visualizer:
    def __init__(self, output_dir="frames"):
        self.output_dir = output_dir
        self.frame_count = 0
        if not os.path.exists(output_dir): 
            os.makedirs(output_dir)

    def capture(self, state, title="Algoritmo"):
        plt.figure(figsize=(6, 4))
        plt.bar(range(len(state)), state, color='skyblue')
        plt.title(f"{title} - Paso {self.frame_count}")
        plt.savefig(f"{self.output_dir}/frame_{self.frame_count:04d}.png")
        plt.close()
        self.frame_count += 1