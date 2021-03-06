/**
 * Copyright 2018 trivago N.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from 'chai';

import { render } from 'melody-component';
import {
    elementOpen,
    elementClose,
    text,
    component,
    patchOuter,
} from 'melody-idom';
import { createComponent, useEffect, useEffectOnce } from '../src';
import { flush } from './util/flush';

const template = {
    render(_context) {
        elementOpen('div', null, null);
        text(_context.value);
        elementClose('div');
    },
};

describe('component', () => {
    it('createComponent should support currying', () => {
        const template1 = {
            render(_context) {
                elementOpen('div');
                elementOpen('span');
                text(_context.value);
                elementClose('span');
                elementClose('div');
            },
        };
        const template2 = {
            render(_context) {
                elementOpen('div');
                elementOpen('div');
                text(_context.value);
                elementClose('div');
                elementClose('div');
            },
        };
        const createHashtagComponent = createComponent(props => ({
            value: `#${props.value}`,
        }));
        const SpanHashtagComponent = createHashtagComponent(template1);
        const DivHashtagComponent = createHashtagComponent(template2);

        const root1 = document.createElement('div');
        render(root1, SpanHashtagComponent, { value: 'foo' });

        const root2 = document.createElement('div');
        render(root2, DivHashtagComponent, { value: 'foo' });
    });
    it('should rerender when props have changed', () => {
        const root = document.createElement('div');
        let called = 0;
        const MyComponent = createComponent(({ value }) => {
            called++;
            return { value };
        }, template);
        render(root, MyComponent, { value: 'foo' });
        render(root, MyComponent, { value: 'bar' });
        assert.equal(called, 2);
    });
    it("should not rerender when props haven't changed", () => {
        const root = document.createElement('div');
        let called = 0;
        const MyComponent = createComponent(({ value }) => {
            called++;
            return { value };
        }, template);
        render(root, MyComponent, { value: 'foo' });
        render(root, MyComponent, { value: 'foo' });
        assert.equal(called, 1);
    });
    it('should replace components', () => {
        const template = {
            render(_context) {
                elementOpen('div', 'test', null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        const MyComponent = createComponent(props => props, template);
        const MyOtherComponent = createComponent(props => props, template);

        render(root, MyComponent, { text: 'hello' });
        assert.equal(root.outerHTML, '<div>hello</div>');

        render(root, MyOtherComponent, { text: 'test' });
        assert.equal(root.outerHTML, '<div>test</div>');
    });
    it('should unmount replaced components', () => {
        const template = {
            render(_context) {
                elementOpen('div', 'test', null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(({ text }) => {
            useEffect(() => () => {
                unmounted++;
            });
            return { text };
        }, template);
        const MyOtherComponent = createComponent(props => props, template);

        render(root, MyComponent, { text: 'hello' });
        assert.equal(root.outerHTML, '<div>hello</div>');

        render(root, MyOtherComponent, { text: 'test' });
        assert.equal(root.outerHTML, '<div>test</div>');
        assert.equal(unmounted, 1);
    });
    it('should render components into an existing DOM', () => {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        }, childTemplate);

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '3', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(
            props => props,
            parentTemplate
        );

        const root = document.createElement('div');
        root.innerHTML = '<div>test</div>';
        assert.equal(root.outerHTML, '<div><div>test</div></div>');
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
    });
    it('should render components into an existing DOM', () => {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        }, childTemplate);

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '4', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(
            props => props,
            parentTemplate
        );

        const root = document.createElement('div');
        root.innerHTML = '<div key="test">test</div>';
        assert.equal(root.outerHTML, '<div><div key="test">test</div></div>');
        const oldChild = root.children[0];
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
        assert.notEqual(oldChild, root.children[0]);
        assert(
            oldChild.parentNode == null,
            'Previous child no longer has a parent'
        );
    });
    it('should reuse moved child components', () => {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
                if (mounted === 3) {
                    throw new Error('gotcha!');
                }
            });
            return props;
        }, childTemplate);

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                if (_context.flip) {
                    component(MyComponent, '2', _context.childProps[1]);
                    component(MyComponent, '1', _context.childProps[0]);
                } else {
                    component(MyComponent, '1', _context.childProps[0]);
                    component(MyComponent, '2', _context.childProps[1]);
                }
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(
            props => props,
            parentTemplate
        );

        const root = document.createElement('div');
        render(root, MyParentComponent, {
            childProps: [{ text: 'hello' }, { text: 'world' }],
        });
        const firstCompEl = root.childNodes[0];
        const secondCompEl = root.childNodes[1];
        assert.equal(
            root.outerHTML,
            '<div><div>hello</div><div>world</div></div>'
        );
        assert.equal(mounted, 2);

        render(root, MyParentComponent, {
            flip: true,
            childProps: [{ text: 'hello' }, { text: 'world' }],
        });
        assert.equal(
            root.outerHTML,
            '<div><div>world</div><div>hello</div></div>'
        );
        assert.equal(firstCompEl, root.childNodes[1]);
        assert.equal(secondCompEl, root.childNodes[0]);
        assert.equal(mounted, 2);
    });
    it('should render existing components into an existing DOM', () => {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
            });
            return props;
        }, childTemplate);

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, '4', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(
            props => props,
            parentTemplate
        );

        const root = document.createElement('div');
        root.innerHTML = '<div key="test">test</div>';
        assert.equal(root.outerHTML, '<div><div key="test">test</div></div>');
        const oldChild = root.children[0];
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);
        assert.notEqual(oldChild, root.children[0]);
        assert(
            oldChild.parentNode == null,
            'Previous child no longer has a parent'
        );
    });
    it('should trigger unmount callback when a Component is removed', () => {
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                elementOpen('p', null, null);
                text(_context.text);
                elementClose('p');
                elementOpen('span');
                text('foo');
                elementClose('span');
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => () => {
                unmounted++;
            });
            return props;
        }, template);

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(MyComponent, 'test', { text: 'hello' });
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><p>hello</p><span>foo</span></div>');
        assert.equal(unmounted, 0);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(unmounted, 1);
    });

    it('should trigger unmount callback when a Component is removed within an element', () => {
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let unmounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => () => {
                unmounted++;
            });
            return props;
        }, template);

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                elementOpen('div');
                component(MyComponent, 'test', { text: 'hello' });
                elementClose('div');
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><div>hello</div></div>');
        assert.equal(unmounted, 0);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(unmounted, 1);
    });
    it('should trigger unmount callback for child components when a Component is removed', () => {
        let MyComponent;
        const template = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                if (_context.comp) {
                    component(MyComponent, 'child', {
                        text: 'world',
                        comp: false,
                    });
                }
                elementClose('div');
            },
        };
        const root = document.createElement('div');
        let mounted = 0;
        MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
                return () => {
                    mounted--;
                };
            });
            return props;
        }, template);

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(MyComponent, 'test', { text: 'hello', comp: true });
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div>hello<div>world</div></div>');
        assert.equal(mounted, 2);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(mounted, 0);
    });
    it('should trigger unmount callback for deep nested child components when a Component is removed', () => {
        let mounted = { inner: 0, middle: 0, outer: 0 };
        const root = document.createElement('div');
        const CountInstances = name => props => {
            useEffectOnce(() => {
                mounted[name]++;
                return () => {
                    mounted[name]--;
                };
            });
            return props;
        };

        const InnerComponent = createComponent(CountInstances('inner'), {
            render(_context) {
                elementOpen('div', null, null);
                elementClose('div');
            },
        });

        const MiddleComponent = createComponent(CountInstances('middle'), {
            render(_context) {
                elementOpen('div', null, null);
                component(InnerComponent, 'child', { inner: true });
                elementClose('div');
            },
        });

        const OuterComponent = createComponent(CountInstances('outer'), {
            render(_context) {
                elementOpen('div', null, null);
                component(MiddleComponent, 'child', {});
                elementClose('div');
            },
        });

        const renderTemplate = _context => {
            elementOpen('div');
            if (_context.comp) {
                component(OuterComponent, 'test', {});
            }
            elementClose('div');
        };

        patchOuter(root, renderTemplate, { comp: true });
        flush();
        assert.equal(root.innerHTML, '<div><div><div></div></div></div>');
        assert.equal(mounted.inner, 1);
        assert.equal(mounted.middle, 1);
        assert.equal(mounted.outer, 1);

        patchOuter(root, renderTemplate, { comp: false });
        flush();
        assert.equal(root.innerHTML, '');
        assert.equal(mounted.inner, 0);
        assert.equal(mounted.middle, 0);
        assert.equal(mounted.outer, 0);
    });
    it('should trigger unmount callback for deep nested child components when a Component is removed', () => {
        let mounted = { innermost: 0, inner: 0, middle: 0, outer: 0 };
        const root = document.createElement('div');
        const CountInstances = name => props => {
            useEffectOnce(() => {
                mounted[name]++;
                return () => {
                    mounted[name]--;
                };
            });
            return props;
        };

        const InnerMostComponent = createComponent(
            CountInstances('innermost'),
            {
                render(_context) {
                    elementOpen('div', null, null);
                    elementClose('div');
                },
            }
        );

        const InnerComponent = createComponent(CountInstances('inner'), {
            render(_context) {
                elementOpen('div', null, null);
                component(InnerMostComponent, 'child', {});
                elementClose('div');
            },
        });

        const MiddleComponent = createComponent(CountInstances('middle'), {
            render(_context) {
                elementOpen('div', null, null);
                component(InnerComponent, 'child', {});
                elementClose('div');
            },
        });

        const OuterComponent = createComponent(CountInstances('outer'), {
            render(_context) {
                elementOpen('div', null, null);
                if (_context.comp) {
                    component(MiddleComponent, 'child', {});
                }
                elementClose('div');
            },
        });

        render(root, OuterComponent, { comp: true });
        assert.equal(root.innerHTML, '<div><div><div></div></div></div>');
        assert.equal(mounted.inner, 1);
        assert.equal(mounted.middle, 1);
        assert.equal(mounted.outer, 1);

        render(root, OuterComponent, { comp: false });
        assert.equal(root.innerHTML, '');
        assert.equal(mounted.inner, 0);
        assert.equal(mounted.middle, 0);
        assert.equal(mounted.outer, 1);
    });

    it('should trigger mount callback once even for nested components', () => {
        const childTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                text(_context.text);
                elementClose('div');
            },
        };

        let mounted = 0;
        const MyComponent = createComponent(props => {
            useEffectOnce(() => {
                mounted++;
            });
            return props;
        }, childTemplate);

        const parentTemplate = {
            render(_context) {
                elementOpen('div', null, null);
                component(MyComponent, 'MyComponent', _context.childProps);
                elementClose('div');
            },
        };
        const MyParentComponent = createComponent(
            props => props,
            parentTemplate
        );

        const root = document.createElement('div');
        render(root, MyParentComponent, { childProps: { text: 'hello' } });
        assert.equal(root.outerHTML, '<div><div>hello</div></div>');
        assert.equal(mounted, 1);

        render(root, MyParentComponent, { childProps: { text: 'test' } });
        assert.equal(root.outerHTML, '<div><div>test</div></div>');
        assert.equal(mounted, 1);
    });
});
