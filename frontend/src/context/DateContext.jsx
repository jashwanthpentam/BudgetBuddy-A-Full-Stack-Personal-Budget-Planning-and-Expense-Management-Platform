import { createContext, useContext, useEffect, useState } from "react";


const DateContext = createContext();

export function DateProvider({ children }) {

    const today = new Date();

    const [globalMonth, setGlobalMonth] = useState(() => {

        return Number(
            localStorage.getItem("globalMonth")
        ) || today.getMonth() + 1;

    });

    const [globalYear, setGlobalYear] = useState(() => {

        return Number(
            localStorage.getItem("globalYear")
        ) || today.getFullYear();

    });

    useEffect(() => {

        localStorage.setItem(
            "globalMonth",
            globalMonth
        );

    }, [globalMonth]);

    useEffect(() => {

        localStorage.setItem(
            "globalYear",
            globalYear
        );

    }, [globalYear]);

    return (

        <DateContext.Provider
            value={{
                globalMonth,
                globalYear,
                setGlobalMonth,
                setGlobalYear,
            }}
        >

            {children}

        </DateContext.Provider>

    );

}

export function useDateContext() {

    return useContext(DateContext);

}