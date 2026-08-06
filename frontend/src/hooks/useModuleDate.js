import { useState } from "react";
import { useDateContext } from "../context/DateContext";

export default function useModuleDate() {

    const {

        globalMonth,
        globalYear,

    } = useDateContext();

    const [localMonth, setLocalMonth] = useState(null);
    const [localYear, setLocalYear] = useState(null);

    return {

        month: localMonth ?? globalMonth,

        year: localYear ?? globalYear,

        setMonth: setLocalMonth,

        setYear: setLocalYear,

        usingGlobal:

            localMonth === null &&
            localYear === null,

    };

}