import { Readable } from 'stream';

export type Obj = Record<string, unknown>;

export function makeStream<T = Obj>(): Readable {
  return new Readable({
    objectMode: true,
    read() {
      /* no-op */
    },
  });
}

export function push<T = Obj>(stream: Readable, value: T): void {
  // emit both 'data' and the raw push for compatibility
  (stream as any).emit('data', value);
}

export function end(stream: Readable): void {
  stream.push(null);
  stream.emit('close');
}
