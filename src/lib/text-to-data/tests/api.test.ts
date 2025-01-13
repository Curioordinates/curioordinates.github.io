import { ttdExpand } from "../api";

describe('api', () => {

    it('should work', async () => {
        const result = ttdExpand('QW245245');
    });

    it('Should handle google link', async () => {
        const result = await ttdExpand("https://maps.app.goo.gl/BSAvxC7hkz8VJnZk7");

        const reuslt2 = await ttdExpand('https://maps.app.goo.gl/r5Vrgy71Jyq4M3kv5');


    });

});