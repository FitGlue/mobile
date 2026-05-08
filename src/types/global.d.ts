import type React from 'react';

// @types/react@19 removed the global JSX namespace. Re-declare it so that
// JSX.Element return type annotations work without importing React in every file.
declare global {
    namespace JSX {
        type Element = React.JSX.Element;
        interface ElementClass extends React.Component<any> {}
        interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    }
}
