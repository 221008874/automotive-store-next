import type { TypographyVariantsOptions } from '@mui/material';
import { fontTokens } from './tokens';

export const typography: TypographyVariantsOptions = {
  fontFamily: fontTokens.family,
  fontWeightRegular: fontTokens.weightRegular,
  fontWeightMedium: fontTokens.weightMedium,
  fontWeightBold: fontTokens.weightBold,
  h4: { fontWeight: fontTokens.weightBold, fontSize: '1.5rem' },
  h5: { fontWeight: fontTokens.weightBold, fontSize: '1.25rem' },
  h6: { fontWeight: fontTokens.weightMedium, fontSize: '1.1rem' },
  body1: { fontSize: '0.875rem' },
  body2: { fontSize: '0.8rem' },
  button: { fontWeight: fontTokens.weightMedium, fontSize: '0.875rem' },
  caption: { fontSize: '0.75rem', color: '#6B7280' },
};
