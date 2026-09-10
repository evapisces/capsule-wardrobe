import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClosetItem, uploadPhoto, getAllCapsules, addItemToCapsule } from '../lib/api';
import { useBreakpoint } from '../lib/useIsMobile';
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = {
    fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-tertiary)',
};
const inputStyle = {
    height: '40px', padding: '0 13px', borderRadius: '9px',
    border: '1px solid var(--line-default)', fontSize: '14px', background: '#FFFFFF',
};
const hintStyle = { fontSize: '11.5px', color: 'var(--ink-tertiary)' };
export default function ItemUploadForm({ closetId, onSuccess, onCancel }) {
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    // The photo / fields split needs ~900px of comfortable room; below the desktop
    // breakpoint (modal is capped at 880px) it collapses to one column.
    const singleColumn = bp !== 'desktop';
    const responsiveInputStyle = isMobile
        ? { ...inputStyle, fontSize: '16px' } // >= 16px stops iOS Safari auto-zooming on focus
        : inputStyle;
    const footerStyle = {
        display: 'flex',
        gap: '10px',
        padding: isMobile ? '14px 16px' : '18px 26px',
        borderTop: '1px solid var(--line-soft)',
        ...(isMobile
            ? { flexDirection: 'column', position: 'sticky', bottom: 0, background: 'var(--bg-page)' }
            : { justifyContent: 'flex-end' }),
    };
    const footerButtonStyle = isMobile
        ? { width: '100%', minHeight: '44px' }
        : undefined;
    const qc = useQueryClient();
    const [name, setName] = useState('');
    const [category, setCategory] = useState('tops');
    const [color, setColor] = useState('');
    const [climate, setClimate] = useState('');
    const [size, setSize] = useState('');
    const [brand, setBrand] = useState('');
    const [pricePaid, setPricePaid] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedCapsuleId, setSelectedCapsuleId] = useState(null);
    // Active + archived, so an item can still be added to an archived capsule.
    const { data: capsules = [] } = useQuery({ queryKey: ['capsules', 'all'], queryFn: getAllCapsules });
    const mutation = useMutation({
        mutationFn: async () => {
            let photoUrl;
            if (photoFile) {
                setUploading(true);
                const { key } = await uploadPhoto(photoFile);
                photoUrl = key;
                setUploading(false);
            }
            const item = await createClosetItem(closetId, {
                name,
                category,
                color: color || undefined,
                climate: climate || undefined,
                size: size || undefined,
                brand: brand || undefined,
                pricePaid: pricePaid ? Number(pricePaid) : undefined,
                photoUrl,
            });
            if (selectedCapsuleId)
                await addItemToCapsule(selectedCapsuleId, item.id);
            return item;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['closetItems', closetId] });
            qc.invalidateQueries({ queryKey: ['closetStats', closetId] });
            onSuccess();
        },
    });
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };
    return (_jsxs("form", { onSubmit: (e) => { e.preventDefault(); mutation.mutate(); }, style: { width: '100%', maxWidth: '880px' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    padding: isMobile ? '18px 16px' : '20px 26px', borderBottom: '1px solid var(--line-soft)',
                }, children: [_jsx("h2", { style: { fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--ink-primary)' }, children: "Add an item" }), _jsx("span", { className: "eyebrow", children: "Step 2 of 2 \u00B7 Details" })] }), _jsxs("div", { "data-testid": "upload-photo-grid", style: {
                    display: 'grid',
                    gridTemplateColumns: singleColumn ? '1fr' : '300px 1fr',
                    gap: '30px',
                    padding: isMobile ? '18px 16px' : '26px',
                }, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "photo", style: {
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    height: isMobile ? '180px' : '340px', borderRadius: '11px', cursor: 'pointer',
                                    border: '1.5px dashed var(--line-dashed-strong)',
                                    background: photoPreview
                                        ? `center/cover no-repeat url(${photoPreview})`
                                        : 'repeating-linear-gradient(135deg, #EDE9E1 0 7px, #F6F3ED 7px 14px)',
                                }, children: !photoPreview && (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--ink-body)' }, children: "Drop a photo" }), _jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-tertiary)', marginTop: '4px' }, children: "or paste a product URL" })] })) }), _jsx("input", { id: "photo", type: "file", accept: "image/*", onChange: handleFileChange, style: { marginTop: '10px' } }), _jsx("p", { style: { ...hintStyle, marginTop: '10px', color: 'var(--ink-secondary)' }, children: "Photos are kept as shot \u2014 no background removal, so what you see is your actual garment." })] }), _jsxs("div", { "data-testid": "upload-field-grid", style: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', alignContent: 'start' }, children: [_jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "name", children: "Name *" }), _jsx("input", { id: "name", "aria-label": "Name", style: responsiveInputStyle, value: name, onChange: (e) => setName(e.target.value), required: true })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "brand", children: "Brand" }), _jsx("input", { id: "brand", style: responsiveInputStyle, value: brand, onChange: (e) => setBrand(e.target.value) })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "category", children: "Category *" }), _jsxs("select", { id: "category", "aria-label": "Category", style: responsiveInputStyle, value: category, onChange: (e) => setCategory(e.target.value), children: [_jsx("option", { value: "tops", children: "Tops" }), _jsx("option", { value: "bottoms", children: "Bottoms" }), _jsx("option", { value: "dresses", children: "Dresses" }), _jsx("option", { value: "shoes", children: "Shoes" }), _jsx("option", { value: "accessories", children: "Accessories" }), _jsx("option", { value: "outerwear", children: "Outerwear" })] }), _jsx("span", { style: hintStyle, children: "Layers \u00B7 Tops \u00B7 Bottoms \u00B7 Shoes \u00B7 Accessories" })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "size", children: "Size" }), _jsx("input", { id: "size", style: responsiveInputStyle, value: size, onChange: (e) => setSize(e.target.value) })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "color", children: "Colour" }), _jsx("input", { id: "color", style: responsiveInputStyle, value: color, onChange: (e) => setColor(e.target.value) })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "climate", children: "Climate band" }), _jsxs("select", { id: "climate", style: responsiveInputStyle, value: climate, onChange: (e) => setClimate(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), _jsx("option", { value: "tropical", children: "Tropical" }), _jsx("option", { value: "temperate", children: "Temperate" }), _jsx("option", { value: "cold", children: "Cold" }), _jsx("option", { value: "layering", children: "Layering" })] }), _jsx("span", { style: hintStyle, children: "Drives capsule match warnings" })] }), _jsxs("div", { style: fieldStyle, children: [_jsx("label", { style: labelStyle, htmlFor: "pricePaid", children: "Price paid" }), _jsx("input", { id: "pricePaid", type: "number", min: "0", step: "0.01", style: responsiveInputStyle, value: pricePaid, onChange: (e) => setPricePaid(e.target.value) }), _jsx("span", { style: hintStyle, children: "Used for cost per wear" })] }), _jsxs("div", { style: { gridColumn: '1 / -1', background: 'var(--accent-green-tint)', borderRadius: '11px', padding: '14px 16px', marginTop: '4px' }, children: [_jsx("div", { style: { fontSize: '13px', fontWeight: 500, color: 'var(--accent-green-ink)', marginBottom: '10px' }, children: "Add to a capsule now?" }), _jsxs("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [capsules.map((c) => (_jsx("button", { type: "button", className: `chip${selectedCapsuleId === c.id ? ' selected' : ''}`, onClick: () => setSelectedCapsuleId((cur) => (cur === c.id ? null : c.id)), children: c.name }, c.id))), _jsx("button", { type: "button", className: `chip${selectedCapsuleId === null ? ' selected' : ''}`, onClick: () => setSelectedCapsuleId(null), children: "Skip for now" })] })] })] })] }), _jsxs("div", { style: footerStyle, children: [_jsx("button", { type: "button", className: "btn-secondary", style: footerButtonStyle, onClick: onCancel, children: "Back" }), _jsx("button", { type: "submit", className: "btn-primary", style: footerButtonStyle, disabled: !name || uploading || mutation.isPending, children: uploading ? 'Uploading…' : mutation.isPending ? 'Saving…' : 'Save item' })] }), mutation.isError && (_jsx("p", { style: { color: 'var(--accent-amber)', padding: '0 26px 16px', fontSize: '13px' }, children: mutation.error.message }))] }));
}
