import React from "react";

function Button({onClick}){
    return (
        <button onClick={onClick}>
            <span>Confirmar</span>
        </button>
    );
}

export default Button;