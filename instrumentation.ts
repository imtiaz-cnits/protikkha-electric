// Server startup instrumentation: Polyfill BigInt serialization globally
export function register() {
  if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function () {
      const int = Number(this);
      return Number.isSafeInteger(int) ? int : this.toString();
    };
  }
}
