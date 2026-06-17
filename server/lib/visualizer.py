"""
visualizer.py — Motor de animaciones para el Tutor de Programación
==================================================================
Coloca este archivo en: server/lib/visualizer.py

Métodos disponibles para el modelo:
  viz.capture(arr, titulo, highlight=[], pivot=None)
  viz.capture_bars_highlight(arr, highlight=[], pivot=None, titulo="")
  viz.capture_matrix(matrix, highlight_cell=None, titulo="")
  viz.capture_graph(nodes, edges, visited=[], current=None, titulo="")
  viz.capture_tree(root, titulo="")
  viz.capture_linked_list(values, current_idx=None, titulo="")
  viz.save_animation(filename="animation.gif", duration=500)
"""

import matplotlib
matplotlib.use('Agg')  # Sin GUI — obligatorio en entornos sin pantalla

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os
import glob

# ── Intentar importar imageio; dar mensaje claro si falta ──
try:
    import imageio.v3 as imageio
except ImportError:
    raise ImportError(
        "Falta imageio. Instálalo con: pip install imageio"
    )

# ── networkx es opcional — solo para capture_graph ──
try:
    import networkx as nx
    _NX_AVAILABLE = True
except ImportError:
    _NX_AVAILABLE = False


# ─────────────────────────────────────────────────────────────
#  PALETA DE COLORES
# ─────────────────────────────────────────────────────────────
CLR = {
    "bg":        "#0d1117",
    "surface":   "#161b22",
    "bar":       "#3b82f6",       # azul base
    "highlight": "#f59e0b",       # amarillo — elemento comparado
    "pivot":     "#ef4444",       # rojo     — pivote / elemento activo
    "sorted":    "#10b981",       # verde    — elemento ya ordenado
    "visited":   "#8b5cf6",       # violeta  — nodo visitado
    "current":   "#f59e0b",       # amarillo — nodo actual
    "edge":      "#4a5568",       # gris oscuro
    "text":      "#e2e8f0",
    "muted":     "#64748b",
    "grid":      "#1c2333",
}

FIG_SIZE   = (8, 4.5)
FONT_TITLE = dict(color=CLR["text"],  fontsize=13, fontweight="bold", fontfamily="monospace")
FONT_LABEL = dict(color=CLR["muted"], fontsize=9,  fontfamily="monospace")


def _apply_dark_bg(fig, ax):
    """Aplica fondo oscuro consistente a figura y ejes."""
    fig.patch.set_facecolor(CLR["bg"])
    ax.set_facecolor(CLR["surface"])
    ax.tick_params(colors=CLR["muted"])
    for spine in ax.spines.values():
        spine.set_edgecolor(CLR["grid"])


# ─────────────────────────────────────────────────────────────
#  CLASE PRINCIPAL
# ─────────────────────────────────────────────────────────────
class Visualizer:
    def __init__(self, output_dir="frames"):
        self.output_dir  = output_dir
        self.frame_count = 0
        os.makedirs(output_dir, exist_ok=True)
        # Limpiar frames anteriores
        for f in glob.glob(f"{output_dir}/frame_*.png"):
            os.remove(f)

    # ── Ruta del siguiente frame ──────────────────────────────
    def _next_frame_path(self):
        path = f"{self.output_dir}/frame_{self.frame_count:04d}.png"
        self.frame_count += 1
        return path

    # ── Guardar figura ────────────────────────────────────────
    def _save_fig(self, fig):
        fig.savefig(
            self._next_frame_path(),
            facecolor=fig.get_facecolor(),
            bbox_inches="tight",
            dpi=100,
        )
        plt.close(fig)

    # =========================================================
    #  1. ARREGLO DE BARRAS (sorting, búsqueda)
    # =========================================================
    def capture(self, arr, titulo="Algoritmo", highlight=[], pivot=None):
        """
        Visualiza un arreglo como barras verticales.

        Parámetros:
          arr       — lista de números
          titulo    — texto del título
          highlight — lista de índices a resaltar en amarillo (comparaciones)
          pivot     — índice del pivote/elemento activo (rojo)

        Ejemplo:
          viz.capture(arr, "Bubble Sort", highlight=[j, j+1])
        """
        fig, ax = plt.subplots(figsize=FIG_SIZE)
        _apply_dark_bg(fig, ax)

        colors = []
        for i in range(len(arr)):
            if pivot is not None and i == pivot:
                colors.append(CLR["pivot"])
            elif i in highlight:
                colors.append(CLR["highlight"])
            else:
                colors.append(CLR["bar"])

        bars = ax.bar(range(len(arr)), arr, color=colors, width=0.7, zorder=2)

        # Etiquetas de valor encima de cada barra
        for bar, val in zip(bars, arr):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.3,
                str(val),
                ha="center", va="bottom",
                fontsize=8, color=CLR["muted"], fontfamily="monospace",
            )

        ax.set_xlim(-0.5, len(arr) - 0.5)
        ax.set_ylim(0, max(arr) * 1.2 + 1 if arr else 10)
        ax.set_title(f"{titulo}  [paso {self.frame_count}]", **FONT_TITLE)
        ax.set_xticks(range(len(arr)))
        ax.set_xticklabels([str(i) for i in range(len(arr))], **FONT_LABEL)
        ax.yaxis.set_visible(False)
        ax.grid(axis="y", color=CLR["grid"], linewidth=0.5, zorder=0)

        # Leyenda
        legend_items = [mpatches.Patch(color=CLR["bar"], label="Normal")]
        if highlight:
            legend_items.append(mpatches.Patch(color=CLR["highlight"], label="Comparando"))
        if pivot is not None:
            legend_items.append(mpatches.Patch(color=CLR["pivot"], label="Pivote"))
        ax.legend(handles=legend_items, loc="upper right",
                  facecolor=CLR["surface"], edgecolor=CLR["grid"],
                  labelcolor=CLR["text"], fontsize=8)

        self._save_fig(fig)

    # Alias más explícito (el modelo puede usar cualquiera de los dos)
    def capture_bars_highlight(self, arr, highlight=[], pivot=None, titulo="Algoritmo"):
        """Alias de capture() con firma más descriptiva."""
        self.capture(arr, titulo=titulo, highlight=highlight, pivot=pivot)

    # =========================================================
    #  2. MATRIZ (programación dinámica, pathfinding)
    # =========================================================
    def capture_matrix(self, matrix, highlight_cell=None, titulo="Matriz DP"):
        """
        Visualiza una matriz 2D con colores de calor.

        Parámetros:
          matrix         — lista de listas de números
          highlight_cell — tupla (fila, col) de la celda activa (roja)
          titulo         — texto del título

        Ejemplo:
          viz.capture_matrix(dp, highlight_cell=(i, j), titulo="Knapsack DP")
        """
        fig, ax = plt.subplots(figsize=FIG_SIZE)
        _apply_dark_bg(fig, ax)

        mat = [[float(v) if v is not None else 0 for v in row] for row in matrix]
        im  = ax.imshow(mat, cmap="Blues", aspect="auto")

        rows = len(mat)
        cols = len(mat[0]) if rows else 0

        for i in range(rows):
            for j in range(cols):
                val = mat[i][j]
                max_val = max(max(r) for r in mat) if mat else 1
                txt_color = "white" if val > (max_val * 0.6) else CLR["muted"]
                label = str(int(val)) if val == int(val) else f"{val:.1f}"
                ax.text(j, i, label,
                        ha="center", va="center",
                        fontsize=8, color=txt_color, fontfamily="monospace")

        if highlight_cell:
            r, c = highlight_cell
            rect = plt.Rectangle((c - 0.5, r - 0.5), 1, 1,
                                  linewidth=2, edgecolor=CLR["pivot"], facecolor="none")
            ax.add_patch(rect)

        ax.set_title(f"{titulo}  [paso {self.frame_count}]", **FONT_TITLE)
        ax.set_xticks(range(cols))
        ax.set_yticks(range(rows))
        ax.tick_params(colors=CLR["muted"], labelsize=8)
        plt.colorbar(im, ax=ax, fraction=0.03)

        self._save_fig(fig)

    # =========================================================
    #  3. GRAFO (DFS, BFS, Dijkstra)
    # =========================================================
    def capture_graph(self, nodes, edges, visited=[], current=None,
                      pos=None, titulo="Grafo"):
        """
        Visualiza un grafo con nodos coloreados según estado.

        Parámetros:
          nodes   — lista de nodos (strings o ints)
          edges   — lista de tuplas (u, v) o (u, v, peso)
          visited — lista de nodos ya visitados (violeta)
          current — nodo actualmente procesado (amarillo)
          pos     — dict {nodo: (x, y)} para layout fijo (opcional)
          titulo  — texto del título

        Ejemplo (BFS):
          viz.capture_graph(nodes, edges, visited=visited, current=node, titulo="BFS")
        """
        if not _NX_AVAILABLE:
            raise ImportError(
                "networkx no está disponible. Instálalo con: pip install networkx"
            )

        fig, ax = plt.subplots(figsize=FIG_SIZE)
        _apply_dark_bg(fig, ax)
        ax.set_axis_off()

        # Construir grafo
        G = nx.DiGraph()
        G.add_nodes_from(nodes)

        weighted = False
        edge_labels = {}
        for e in edges:
            if len(e) == 3:
                G.add_edge(e[0], e[1], weight=e[2])
                edge_labels[(e[0], e[1])] = e[2]
                weighted = True
            else:
                G.add_edge(e[0], e[1])

        layout = pos or nx.spring_layout(G, seed=42)

        # Colores de nodos
        node_colors = []
        for n in G.nodes():
            if n == current:
                node_colors.append(CLR["current"])
            elif n in visited:
                node_colors.append(CLR["visited"])
            else:
                node_colors.append(CLR["bar"])

        nx.draw_networkx_nodes(G, layout, node_color=node_colors,
                               node_size=600, ax=ax)
        nx.draw_networkx_labels(G, layout, font_color=CLR["bg"],
                                font_size=9, font_weight="bold", ax=ax)
        nx.draw_networkx_edges(G, layout, edge_color=CLR["edge"],
                               arrows=True, arrowsize=15,
                               width=1.5, ax=ax)
        if weighted:
            nx.draw_networkx_edge_labels(G, layout, edge_labels=edge_labels,
                                         font_color=CLR["muted"], font_size=8, ax=ax)

        # Leyenda
        legend_items = [
            mpatches.Patch(color=CLR["bar"],     label="Sin visitar"),
            mpatches.Patch(color=CLR["visited"], label="Visitado"),
            mpatches.Patch(color=CLR["current"], label="Actual"),
        ]
        ax.legend(handles=legend_items, loc="upper right",
                  facecolor=CLR["surface"], edgecolor=CLR["grid"],
                  labelcolor=CLR["text"], fontsize=8)

        ax.set_title(f"{titulo}  [paso {self.frame_count}]", **FONT_TITLE)
        self._save_fig(fig)

    # =========================================================
    #  4. ÁRBOL BINARIO
    # =========================================================
    def capture_tree(self, root, titulo="Árbol"):
        """
        Visualiza un árbol binario.

        Acepta dos formatos:
          A) Lista BFS: [1, 2, 3, 4, 5, None, 7]
          B) Objeto/dict con .val, .left, .right
             Puede tener .highlight=True para pintar en amarillo

        Ejemplo:
          viz.capture_tree([8,3,10,1,6,None,14], titulo="BST")
        """
        fig, ax = plt.subplots(figsize=FIG_SIZE)
        _apply_dark_bg(fig, ax)
        ax.set_axis_off()

        # Normalizar a lista BFS de tuplas (valor, highlight)
        if isinstance(root, list):
            nodes_bfs = [(v, False) if v is not None else None for v in root]
        else:
            nodes_bfs = []
            queue = [root]
            while queue:
                node = queue.pop(0)
                if node is None:
                    nodes_bfs.append(None)
                    continue
                val = node.val if hasattr(node, "val") else node["val"]
                hl  = getattr(node, "highlight", False) or (isinstance(node, dict) and node.get("highlight", False))
                nodes_bfs.append((val, hl))
                left  = node.left  if hasattr(node, "left")  else node.get("left")
                right = node.right if hasattr(node, "right") else node.get("right")
                queue.append(left)
                queue.append(right)

        # Calcular posiciones recursivamente
        n = len(nodes_bfs)
        positions = {}

        def get_pos(idx, depth, left_bound, right_bound):
            if idx >= n or nodes_bfs[idx] is None:
                return
            x = (left_bound + right_bound) / 2
            y = -depth * 0.25
            positions[idx] = (x, y)
            mid = (left_bound + right_bound) / 2
            get_pos(2 * idx + 1, depth + 1, left_bound, mid)
            get_pos(2 * idx + 2, depth + 1, mid, right_bound)

        get_pos(0, 0, 0.0, 1.0)

        # Dibujar aristas
        for idx in positions:
            for child_offset in [1, 2]:
                child_idx = 2 * idx + child_offset
                if child_idx in positions:
                    x0, y0 = positions[idx]
                    x1, y1 = positions[child_idx]
                    ax.plot([x0, x1], [y0, y1], color=CLR["edge"], lw=1.5, zorder=1)

        # Dibujar nodos
        radius = 0.035
        for idx, (x, y) in positions.items():
            item = nodes_bfs[idx]
            if item is None:
                continue
            val, hl = item
            color = CLR["highlight"] if hl else CLR["bar"]
            circle = plt.Circle((x, y), radius, color=color, zorder=2,
                                 transform=ax.transData)
            ax.add_patch(circle)
            ax.text(x, y, str(val), ha="center", va="center",
                    fontsize=8, color=CLR["bg"], fontweight="bold",
                    fontfamily="monospace", zorder=3)

        ax.autoscale_view()
        ax.set_aspect("equal")
        ax.set_title(f"{titulo}  [paso {self.frame_count}]", **FONT_TITLE)
        self._save_fig(fig)

    # =========================================================
    #  5. LISTA ENLAZADA
    # =========================================================
    def capture_linked_list(self, values, current_idx=None, titulo="Lista Enlazada"):
        """
        Visualiza una lista enlazada como cajas horizontales con flechas.

        Parámetros:
          values      — lista de valores [1, 3, 5, 2, ...]
          current_idx — índice del nodo actualmente procesado (amarillo)
          titulo      — texto del título

        Ejemplo:
          viz.capture_linked_list(values, current_idx=i, titulo="Recorrido")
        """
        fig, ax = plt.subplots(figsize=FIG_SIZE)
        _apply_dark_bg(fig, ax)
        ax.set_axis_off()

        n      = len(values)
        box_w  = 0.8
        box_h  = 0.5
        gap    = 0.4
        y      = 0.5

        for i, val in enumerate(values):
            x = i * (box_w + gap)
            color = CLR["highlight"] if i == current_idx else CLR["bar"]

            # Caja valor
            rect = mpatches.FancyBboxPatch(
                (x, y - box_h / 2), box_w * 0.65, box_h,
                boxstyle="round,pad=0.04",
                facecolor=color, edgecolor=CLR["surface"], linewidth=1.5,
            )
            ax.add_patch(rect)
            ax.text(x + box_w * 0.325, y, str(val),
                    ha="center", va="center",
                    fontsize=10, color=CLR["bg"],
                    fontweight="bold", fontfamily="monospace")

            # Caja puntero
            ptr_rect = mpatches.FancyBboxPatch(
                (x + box_w * 0.65, y - box_h / 2), box_w * 0.2, box_h,
                boxstyle="round,pad=0.02",
                facecolor=CLR["surface"], edgecolor=CLR["grid"], linewidth=1,
            )
            ax.add_patch(ptr_rect)

            # Flecha al siguiente nodo
            if i < n - 1:
                ax.annotate(
                    "",
                    xy=(x + box_w + gap * 0.15, y),
                    xytext=(x + box_w * 0.85, y),
                    arrowprops=dict(arrowstyle="->", color=CLR["muted"], lw=1.5),
                )
            else:
                # NULL
                ax.text(x + box_w * 0.75, y, "∅",
                        ha="center", va="center",
                        fontsize=10, color=CLR["muted"])

        total_width = n * (box_w + gap)
        ax.set_xlim(-0.3, total_width + 0.2)
        ax.set_ylim(0.0, 1.0)
        ax.set_title(f"{titulo}  [paso {self.frame_count}]", **FONT_TITLE)
        self._save_fig(fig)

    # =========================================================
    #  GENERAR GIF
    # =========================================================
    def save_animation(self, filename="animation.gif", duration=500):
        """
        Une todos los frames en un GIF animado.

        Parámetros:
          filename — nombre del archivo de salida dentro de frames/
          duration — milisegundos por frame (default: 500)

        Devuelve la ruta del GIF generado.
        """
        frames = sorted(glob.glob(f"{self.output_dir}/frame_*.png"))
        if not frames:
            raise ValueError(
                "No hay frames. Asegúrate de llamar a algún método capture() antes de save_animation()."
            )

        gif_path = f"{self.output_dir}/{filename}"
        images   = [imageio.imread(f) for f in frames]

        # imageio v3 usa segundos por frame
        imageio.imwrite(
            gif_path, images,
            duration=duration / 1000,
            loop=0,
        )

        print(f"[Visualizer] GIF guardado: {gif_path} ({len(frames)} frames)")
        return gif_path