import { registerResumable, startResumability } from 'blokd/client';
import { updateGuests } from './resumables/private-dining';

registerResumable('/src/resumables/private-dining.ts#updateGuests', updateGuests);

startResumability({
  allowRef(ref) {
    return ref.startsWith('/src/resumables/');
  },
  onError(error) {
    console.error('[blokd resume]', error);
  }
});
