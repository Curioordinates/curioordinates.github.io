


export type ErrorOrFields<Data> = 
  | { error: Error } & { [K in keyof Data]: null }
  | { error: null } & Data

// single function overloa for convenience
export function cascadeFields<T1, T2>(
  input: T1,
  f1: (input: T1) => Promise<ErrorOrFields<T2>>
): Promise<ErrorOrFields<T2>>;

// Overload for 2 functions
export function cascadeFields<T1, T2, T3>(
  input: T1,
  f1: (input: T1) => Promise<ErrorOrFields<T2>>,
  f2: (input: T1 & T2) => Promise<ErrorOrFields<T3>>
): Promise<ErrorOrFields<T3>>;

// Overload for 3 functions
export function cascadeFields<T1, T2, T3, T4>(
  input: T1,
  f1: (input: T1) => Promise<ErrorOrFields<T2>>,
  f2: (input: T1 & T2) => Promise<ErrorOrFields<T3>>,
  f3: (input: T1 & T2 & T3) => Promise<ErrorOrFields<T4>>
): Promise<ErrorOrFields<T4>>;

// Overload for 4 functions
export function cascadeFields<T1, T2, T3, T4, T5>(
  input: T1,
  f1: (input: T1) => Promise<ErrorOrFields<T2>>,
  f2: (input: T1 & T2) => Promise<ErrorOrFields<T3>>,
  f3: (input: T1 & T2 & T3) => Promise<ErrorOrFields<T4>>,
  f4: (input: T1 & T2 & T3 & T4) => Promise<ErrorOrFields<T5>>
): Promise<ErrorOrFields<T5>>;

// Final implementation
export async function cascadeFields(input: any, ...functions: any[]): Promise<ErrorOrFields<any>>  {
   let currentInput = input;
    let currentResult: any = null;

    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      const result = await func(currentInput);
      
      if (result.error) {
        return { error: result.error } as ErrorOrFields<any>;
      }
      
      currentResult = result;
      if (i < functions.length - 1) {
        // Union the current input with the result data for the next function
        const { error, ...dataFields } = result;
        currentInput = { ...currentInput, ...dataFields };
      }
    }
    
    return currentResult;
  };




