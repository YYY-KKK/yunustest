import * as assert from 'assert';
import * as helpers from '../../lib/helpers';

describe('helpers module', function () {
    it('format should support object variable', function () {
        let objectString = helpers.format('pre {0} post', { foo: 1, bar: "abc" });
        assert.equal(objectString, 'pre {"foo":1,"bar":"abc"} post');
    });

    it('format should support string variable', function () {
        let objectString = helpers.format('pre {0} post', 'abc');
        assert.equal(objectString, 'pre abc post');
    });

    it('format should support number variable', function () {
        let objectString = helpers.format('pre {0} post', 123);
        assert.equal(objectString, 'pre 123 post');
    });

    it('format should support boolean variable', function () {
        let objectString = helpers.format('pre {0} post', true);
        assert.equal(objectString, 'pre true post');
    });

    it('format should support undefined variable', function () {
        let objectString = helpers.format('pre {0} post');
        assert.equal(objectString, 'pre {0} post');
    });
});