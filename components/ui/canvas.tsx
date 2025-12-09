interface OscillatorConfig {
  phase?: number;
  offset?: number;
  frequency?: number;
  amplitude?: number;
}

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface LineConfig {
  spring: number;
}

interface CanvasContextExtended extends CanvasRenderingContext2D {
  running: boolean;
  frame: number;
}

interface Position {
  x: number;
  y: number;
}

interface EnvironmentConfig {
  debug: boolean;
  friction: number;
  trails: number;
  size: number;
  dampening: number;
  tension: number;
}

class Oscillator {
  phase: number;
  offset: number;
  frequency: number;
  amplitude: number;
  value: number;

  constructor(config: OscillatorConfig = {}) {
    this.phase = config.phase || 0;
    this.offset = config.offset || 0;
    this.frequency = config.frequency || 0.001;
    this.amplitude = config.amplitude || 1;
    this.value = 0;
  }

  update(): number {
    this.phase += this.frequency;
    this.value = this.offset + Math.sin(this.phase) * this.amplitude;
    return this.value;
  }
}

class Node implements NodePoint {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
}

class Line {
  spring: number;
  friction: number;
  nodes: Node[];

  constructor(config: LineConfig, env: EnvironmentConfig, pos: Position) {
    this.spring = config.spring + 0.1 * Math.random() - 0.05;
    this.friction = env.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    
    for (let i = 0; i < env.size; i++) {
      const node = new Node();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  update(pos: Position, env: EnvironmentConfig): void {
    if (this.nodes.length === 0) {
      return
    }

    let spring = this.spring;
    const firstNode = this.nodes[0]!;

    firstNode.vx += (pos.x - firstNode.x) * spring;
    firstNode.vy += (pos.y - firstNode.y) * spring;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]!;

      if (i > 0) {
        const prev = this.nodes[i - 1]!;
        node.vx += (prev.x - node.x) * spring;
        node.vy += (prev.y - node.y) * spring;
        node.vx += prev.vx * env.dampening;
        node.vy += prev.vy * env.dampening;
      }
      
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      spring *= env.tension;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.nodes.length === 0) {
      return
    }

    const firstNode = this.nodes[0]!;
    if (this.nodes.length === 1) {
      ctx.beginPath();
      ctx.moveTo(firstNode.x, firstNode.y);
      ctx.stroke();
      ctx.closePath();
      return
    }
    let x = firstNode.x;
    let y = firstNode.y;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    for (let i = 1; i < this.nodes.length - 2; i++) {
      const curr = this.nodes[i]!;
      const next = this.nodes[i + 1]!;
      x = 0.5 * (curr.x + next.x);
      y = 0.5 * (curr.y + next.y);
      ctx.quadraticCurveTo(curr.x, curr.y, x, y);
    }

    const lastNode = this.nodes[this.nodes.length - 2]!;
    const finalNode = this.nodes[this.nodes.length - 1]!;
    ctx.quadraticCurveTo(lastNode.x, lastNode.y, finalNode.x, finalNode.y);
    ctx.stroke();
    ctx.closePath();
  }
}

let ctx: CanvasContextExtended | null = null;
let oscillator: Oscillator | null = null;
let pos: Position = { x: 0, y: 0 };
let lines: Line[] = [];

const E: EnvironmentConfig = {
  debug: true,
  friction: 0.5,
  trails: 80,
  size: 50,
  dampening: 0.025,
  tension: 0.99,
};

function initLines(): void {
  lines = [];
  for (let i = 0; i < E.trails; i++) {
    lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }, E, pos));
  }
}

function handleMove(e: MouseEvent | TouchEvent): void {
  if ('touches' in e && e.touches.length > 0) {
    const touch = e.touches[0]
    if (!touch) return
    pos.x = touch.pageX;
    pos.y = touch.pageY;
  } else if ('clientX' in e) {
    pos.x = e.clientX;
    pos.y = e.clientY;
  }
  e.preventDefault();
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    if (!touch) return
    pos.x = touch.pageX;
    pos.y = touch.pageY;
  }
}

function onMousemove(e: MouseEvent | TouchEvent): void {
  document.removeEventListener('mousemove', onMousemove);
  document.removeEventListener('touchstart', onMousemove as EventListener);
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove as EventListener);
  document.addEventListener('touchstart', handleTouchStart);
  handleMove(e);
  initLines();
  render();
}

function render(): void {
  if (!ctx || !ctx.running || !oscillator) return;
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `hsla(${Math.round(oscillator.update())},100%,50%,0.025)`;
  ctx.lineWidth = 10;

  for (let i = 0; i < E.trails; i++) {
    const line = lines[i]
    if (!line) continue
    line.update(pos, E);
    line.draw(ctx);
  }
  
  ctx.frame++;
  window.requestAnimationFrame(render);
}

function resizeCanvas(): void {
  if (!ctx) return;
  ctx.canvas.width = window.innerWidth - 20;
  ctx.canvas.height = window.innerHeight;
}

export const renderCanvas = function (): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  
  const context = canvas.getContext('2d');
  if (!context) return;
  
  ctx = context as CanvasContextExtended;
  ctx.running = true;
  ctx.frame = 1;
  
  oscillator = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  });
  
  document.addEventListener('mousemove', onMousemove);
  document.addEventListener('touchstart', onMousemove as EventListener);
  document.body.addEventListener('orientationchange', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
  
  window.addEventListener('focus', () => {
    if (ctx && !ctx.running) {
      ctx.running = true;
      render();
    }
  });
  
  window.addEventListener('blur', () => {
    if (ctx) {
      ctx.running = true;
    }
  });
  
  resizeCanvas();
};
