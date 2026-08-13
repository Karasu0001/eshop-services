using OrderService.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OrderService.Orders.GenerateOrderPdf
{
    // Comprobante de compra en PDF, estilo "detalle de tu pedido" (Mercado Libre / Amazon):
    // encabezado de marca, datos de la orden, tabla de productos y totales.
    public class OrderPdfDocument(Order order) : IDocument
    {
        private static readonly string CurrencyCulture = "en-US";

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(35);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Gracias por tu compra en MaruchanMarket · ").FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontColor(Colors.Grey.Medium);
                    text.Span(" / ").FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontColor(Colors.Grey.Medium);
                });
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    column.Item().Text("🍜 MaruchanMarket").FontSize(20).Bold().FontColor("#07271D");
                    column.Item().Text("Comprobante de compra").FontSize(12).FontColor(Colors.Grey.Darken1);
                });

                row.ConstantItem(170).Column(column =>
                {
                    column.Item().AlignRight().Text($"Orden #{order.Id}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    column.Item().AlignRight().Text(order.CreatedAt.ToLocalTime().ToString("dd/MM/yyyy HH:mm")).FontSize(9).FontColor(Colors.Grey.Darken1);
                    column.Item().AlignRight().PaddingTop(4).Element(c => StatusBadge(c, order.Status));
                });
            });
        }

        private void StatusBadge(IContainer container, OrderStatus status)
        {
            var (label, background, foreground) = status switch
            {
                OrderStatus.Pending => ("Pendiente", "#FDF0C7", "#6B4E00"),
                OrderStatus.Confirmed => ("Confirmada", "#DCEFC9", "#07271D"),
                OrderStatus.Cancelled => ("Cancelada", "#FDECEC", "#D1414A"),
                _ => (status.ToString(), "#F0F0F0", "#000000"),
            };

            container.Background(background).Padding(5).AlignRight().Text(label).FontSize(9).Bold().FontColor(foreground);
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(20).Column(column =>
            {
                column.Spacing(15);

                column.Item().Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
                {
                    row.RelativeItem().Text(text =>
                    {
                        text.Span("Cliente: ").SemiBold();
                        text.Span(order.CustomerId);
                    });
                    row.RelativeItem().AlignRight().Text(text =>
                    {
                        text.Span("Cantidad de productos: ").SemiBold();
                        text.Span(order.Items.Count.ToString());
                    });
                });

                column.Item().Element(ComposeItemsTable);
                column.Item().AlignRight().Element(ComposeTotals);
            });
        }

        private void ComposeItemsTable(IContainer container)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(4);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Producto");
                    header.Cell().Element(HeaderCell).AlignCenter().Text("Cant.");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Precio unitario");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Subtotal");

                    static IContainer HeaderCell(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold().FontColor(Colors.White))
                            .Background("#07271D").Padding(6);
                });

                foreach (var item in order.Items)
                {
                    table.Cell().Element(BodyCell).Text(item.ProductName);
                    table.Cell().Element(BodyCell).AlignCenter().Text(item.Quantity.ToString());
                    table.Cell().Element(BodyCell).AlignRight().Text(FormatMoney(item.UnitPrice));
                    table.Cell().Element(BodyCell).AlignRight().Text(FormatMoney(item.LineTotal));

                    static IContainer BodyCell(IContainer c) =>
                        c.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(6).PaddingHorizontal(6);
                }
            });
        }

        private void ComposeTotals(IContainer container)
        {
            container.Width(220).Column(column =>
            {
                TotalRow(column, "Subtotal", order.Subtotal, bold: false);
                TotalRow(column, "Impuestos", order.Tax, bold: false);
                column.Item().PaddingTop(4).BorderTop(1).BorderColor(Colors.Grey.Lighten1);
                TotalRow(column, "Total", order.Total, bold: true);
            });
        }

        private void TotalRow(ColumnDescriptor column, string label, decimal value, bool bold)
        {
            column.Item().PaddingTop(2).Row(row =>
            {
                var labelSpan = row.RelativeItem().Text(label).FontSize(bold ? 12 : 10);
                var valueSpan = row.ConstantItem(90).AlignRight().Text(FormatMoney(value)).FontSize(bold ? 12 : 10);
                if (bold)
                {
                    labelSpan.Bold();
                    valueSpan.Bold();
                }
            });
        }

        private static string FormatMoney(decimal value) =>
            value.ToString("C2", System.Globalization.CultureInfo.GetCultureInfo(CurrencyCulture));
    }
}
