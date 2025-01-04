import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/multi_swap/router.tact',
    options: {
        debug: false,
    },
};
