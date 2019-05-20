import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

export function tryTriggerFunc(fn?: (...args: any[]) => any) {
  return (...args: any[]) => {
    // NOTE: here might be some problems with this binding.
    if (fn) {
      fn(...args);
    }
  };
}

export function inNextTick(): Observable<void> {
  const timer = new Subject<void>();
  Promise.resolve().then(() => timer.next());
  return timer.asObservable().pipe(take(1));
}
