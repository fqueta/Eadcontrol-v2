import { useRef } from "react";

const TextField = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={divRef} >
            aqui mesmo
            <input ref={inputRef} type="text"/>
        </div>
    );
}

export default TextField;
