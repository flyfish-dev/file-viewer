// Importing the pinned loader in a Worker activates its built-in Comlink
// decodeTask endpoint. Keeping this entry in our package lets consumers bundle
// the worker without reaching through unexported Cornerstone paths.
import '@cornerstonejs/dicom-image-loader';
