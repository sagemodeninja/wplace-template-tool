const decimalFormatter = new Intl.NumberFormat("en-PH", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

const toDecimal = (value: number) => {
    return decimalFormatter.format(value);
};

export const numbers = { toDecimal };
