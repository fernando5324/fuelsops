import { usePage } from '@inertiajs/react';

export default function useTranslations() {
    const { translations, locale } = usePage().props;

    const t = (key, replace = {}) => {
        let value = key
            .split('.')
            .reduce((obj, k) => (obj ? obj[k] : undefined), translations);

        if (value === undefined) {
            value = key;
        } else {
            for (const [k, v] of Object.entries(replace)) {
                value = value.replaceAll(`:${k}`, v);
            }
        }

        return value;
    };

    return { t, locale };
}
