import postgres from 'postgres';

declare global {
    var postgres: ReturnType<typeof postgres> | undefined;
}

export { };
